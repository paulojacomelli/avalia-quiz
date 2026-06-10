import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from '@google/genai';

export type LiveSessionPhase = 'idle' | 'connecting' | 'speaking' | 'listening' | 'processing' | 'error';

export interface LiveSessionCallbacks {
  onPhaseChange: (phase: LiveSessionPhase) => void;
  /** Transcrição parcial/final da fala do usuário */
  onTranscript: (text: string, isFinal: boolean) => void;
  /** Transcrição do que o modelo falou */
  onModelTranscript: (text: string) => void;
  /** Chamado quando o modelo terminou de ouvir e há transcrição disponível */
  onEvaluationReady: (userTranscript: string) => void;
  onError: (message: string) => void;
}

const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview';
const MIC_SAMPLE_RATE = 16000;
const OUT_SAMPLE_RATE = 24000;

/** Float32 (WebAudio) → Int16 PCM little-endian */
function float32ToInt16(float32: Float32Array): ArrayBuffer {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
}

/** Int16 PCM little-endian → Float32 (WebAudio) */
function int16ToFloat32(buffer: ArrayBuffer): Float32Array {
  const int16 = new Int16Array(buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

/** Converte base64 PCM → ArrayBuffer */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

/** ArrayBuffer → base64 */
function arrayBufferToBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export class LiveApiSession {
  private session: Session | null = null;
  private micContext: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private playContext: AudioContext | null = null;
  private playbackQueue: Float32Array[] = [];
  private isPlaying = false;
  private userTranscript = '';
  private currentPhase: LiveSessionPhase = 'idle';
  private terminated = false;
  private readonly callbacks: LiveSessionCallbacks;

  constructor(callbacks: LiveSessionCallbacks) {
    this.callbacks = callbacks;
  }

  private setPhase(phase: LiveSessionPhase): void {
    this.currentPhase = phase;
    this.callbacks.onPhaseChange(phase);
  }

  async start(apiKey: string, questionText: string, model?: string, customSystemInstruction?: string): Promise<void> {
    console.log('[LiveApiSession] start() iniciado. Modelo:', model, 'Instrucao personalizada:', !!customSystemInstruction);
    this.terminated = false;
    this.userTranscript = '';
    this.setPhase('connecting');

    const resolvedModel = model?.trim() || DEFAULT_LIVE_MODEL;

    // 1. Solicitar microfone antes de abrir WebSocket
    try {
      console.log('[LiveApiSession] Configurando microfone...');
      await this._setupMicrophone();
      console.log('[LiveApiSession] Microfone configurado com sucesso.');
    } catch (err: any) {
      console.error('[LiveApiSession] Erro ao configurar microfone:', err);
      const name: string = err?.name || '';
      let msg: string;
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        msg = 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.';
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        msg = 'Permissão de microfone negada. Permita o acesso ao microfone nas configurações do navegador.';
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        msg = 'Microfone em uso por outro aplicativo. Feche outros programas e tente novamente.';
      } else {
        msg = 'Erro ao acessar microfone: ' + (err?.message || String(err));
      }
      this.callbacks.onError(msg);
      this.setPhase('error');
      return;
    }

    // 2. Conectar à API Live após confirmar microfone disponível
    try {
      console.log('[LiveApiSession] Inicializando GoogleGenAI e conectando live...');
      const ai = new GoogleGenAI({ apiKey });

      this.session = await ai.live.connect({
        model: resolvedModel,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: customSystemInstruction || [
            'Você é um avaliador de quiz em português brasileiro.',
            'Leia a pergunta em voz alta de forma clara.',
            'Quando o usuário terminar de responder, ouça a resposta completa.',
            'Não avalie a resposta — apenas ouça e confirme que entendeu.',
            'Seja conciso.',
          ].join(' '),
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' }
            }
          }
        },
        callbacks: {
          onopen: async () => {
            console.log('[LiveApiSession] WebSocket onopen chamado.');
            if (this.terminated) return;
            
            // Aguarda a atribuição da sessão para evitar race condition
            let checkCount = 0;
            while (!this.session && !this.terminated && checkCount < 100) {
              await new Promise(resolve => setTimeout(resolve, 10));
              checkCount++;
            }
            
            if (this.terminated || !this.session) {
              console.warn('[LiveApiSession] Sessão não inicializada a tempo ou terminada no onopen.');
              return;
            }
            
            this._sendQuestion(questionText);
          },
          onmessage: (msg: LiveServerMessage) => {
            if (this.terminated) return;
            this._handleMessage(msg);
          },
          onerror: (e: ErrorEvent) => {
            console.error('[LiveApiSession] WebSocket onerror chamado:', e);
            if (!this.terminated) {
              this.callbacks.onError('Erro na conexão Live: ' + (e?.message || 'desconhecido'));
              this.setPhase('error');
            }
          },
          onclose: () => {
            console.log('[LiveApiSession] WebSocket onclose chamado.');
            if (!this.terminated) this._onSessionClose();
          },
        },
      });
      console.log('[LiveApiSession] Conexao iniciada (sessao WebSocket criada).');

    } catch (err: any) {
      console.error('[LiveApiSession] Exceção ao conectar à API Live:', err);
      const msg = err?.message || String(err);
      this.callbacks.onError('Falha ao conectar à API Live: ' + msg);
      this.setPhase('error');
    }
  }

  private _sendQuestion(questionText: string): void {
    if (!this.session) return;
    try {
      this.session.sendClientContent({
        turns: `Pergunta do quiz: "${questionText}"`,
        turnComplete: true,
      });
      this.setPhase('speaking');
    } catch (err: any) {
      this.callbacks.onError('Erro ao enviar pergunta: ' + (err?.message || err));
    }
  }

  private async _setupMicrophone(): Promise<void> {
    // getUserMedia primeiro — pode lançar DOMException com nome descritivo
    // AudioContexts só são criados após confirmação de acesso ao mic
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: MIC_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    if (this.terminated) {
      stream.getTracks().forEach(t => t.stop());
      return;
    }

    this.micStream = stream;

    this.micContext = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
    this.playContext = new AudioContext({ sampleRate: OUT_SAMPLE_RATE });

    const source = this.micContext.createMediaStreamSource(this.micStream);
    // ScriptProcessorNode: deprecated mas com suporte universal em browsers
    this.scriptProcessor = this.micContext.createScriptProcessor(4096, 1, 1);

    this.scriptProcessor.onaudioprocess = (e: AudioProcessingEvent) => {
      if (this.terminated || !this.session || this.currentPhase !== 'listening') return;
      const pcmBuf = float32ToInt16(e.inputBuffer.getChannelData(0));
      const base64 = arrayBufferToBase64(pcmBuf);
      this.session.sendRealtimeInput({
        audio: { data: base64, mimeType: `audio/pcm;rate=${MIC_SAMPLE_RATE}` }
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.micContext.destination);
  }

  private _handleMessage(msg: LiveServerMessage): void {
    const sc = msg.serverContent;
    if (!sc) return;

    // --- Áudio de saída do modelo → reproduzir ---
    // O getter msg.data retorna base64 concatenado de todos os inlineData parts
    const audioData = msg.data;
    if (audioData) {
      this._enqueueAudio(base64ToArrayBuffer(audioData));
    }

    // --- Transcrição da saída do modelo ---
    if (sc.outputTranscription?.text) {
      this.callbacks.onModelTranscript(sc.outputTranscription.text);
    }

    // --- Transcrição da entrada do usuário ---
    if (sc.inputTranscription?.text) {
      this.userTranscript = sc.inputTranscription.text;
      this.callbacks.onTranscript(
        this.userTranscript,
        sc.inputTranscription.finished ?? false
      );
    }

    // --- Modelo terminou de falar → começa a ouvir o usuário ---
    if (sc.turnComplete) {
      this.setPhase('listening');
    }

    // --- Modelo foi interrompido ---
    if (sc.interrupted) {
      this.setPhase('listening');
    }
  }

  private _onSessionClose(): void {
    const transcript = this.userTranscript.trim();
    if (transcript) {
      this.setPhase('processing');
      this.callbacks.onEvaluationReady(transcript);
    } else {
      this.setPhase('idle');
    }
  }

  private _enqueueAudio(pcmBuf: ArrayBuffer): void {
    this.playbackQueue.push(int16ToFloat32(pcmBuf));
    if (!this.isPlaying) this._playNext();
  }

  private _playNext(): void {
    if (!this.playContext || this.playbackQueue.length === 0) {
      this.isPlaying = false;
      return;
    }
    this.isPlaying = true;
    const samples = this.playbackQueue.shift()!;
    const buf = this.playContext.createBuffer(1, samples.length, OUT_SAMPLE_RATE);
    buf.getChannelData(0).set(samples);
    const source = this.playContext.createBufferSource();
    source.buffer = buf;
    source.connect(this.playContext.destination);
    source.onended = () => this._playNext();
    source.start();
  }

  /** Encerra a sessão (ex: usuário pulou a questão) */
  stop(): void {
    this.terminated = true;
    try { this.session?.close(); } catch {}
    try { this.micStream?.getTracks().forEach(t => t.stop()); } catch {}
    try { this.scriptProcessor?.disconnect(); } catch {}
    try { this.micContext?.close(); } catch {}
    try { this.playContext?.close(); } catch {}
    this.playbackQueue = [];
    this.session = null;
    this.micContext = null;
    this.micStream = null;
    this.scriptProcessor = null;
    this.playContext = null;
  }
}
