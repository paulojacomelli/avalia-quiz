
export enum Difficulty {
  EASY = 'Fácil',
  MEDIUM = 'Médio',
  HARD = 'Difícil'
}

export enum TopicMode {
  ACADEMIC = 'Acadêmico',
  ENTERTAINMENT = 'Entretenimento',
  ARTS_CULTURE = 'Arte & Cultura',
  GEOPOLITICS = 'Geopolítica',
  ANIMALS = 'Mundo Animal',
  OTHER = 'Outro Assunto'
}

export enum QuizFormat {
  MULTIPLE_CHOICE = 'Múltipla Escolha',
  TRUE_FALSE = 'Verdadeiro ou Falso',
  OPEN_ENDED = 'Resposta Livre (IA)'
}

export enum HintType {
  STANDARD = 'Dica Padrão',
  ASK_AI = 'Pergunte ao Chat'
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[]; // Opções para Múltipla Escolha (4) ou VF (2), vazio para Resposta Livre
  correctAnswerIndex: number; // Índice da resposta correta (0-3 ou 0-1) - Ignorado na Resposta Livre
  correctAnswerText?: string; // Texto da resposta canônica (usado na validação da Resposta Livre)
  reference: string;
  hint: string; // Dica amigável para ajudar o jogador
  explanation: string; // Explicação breve e didática do porquê a resposta é correta
  glosa?: string; // Glosa em Libras formatada para o VLibras (MAIÚSCULAS, sem artigos/preposições)
  audioBase64?: string; // Áudio da pergunta pré-gerado via TTS, codificado em Base64 (temporário — descartado após upload)
  audioUrl?: string;    // URL permanente no Firebase Storage (substitui audioBase64 após upload)
}

export interface Team {
  id: string;
  name: string;
  color: string; // Código Hexadecimal para a identidade visual da equipe
  score: number;
  correctCount: number;
  wrongCount: number;
  hintsUsed: number;
}

export interface TTSConfig {
  enabled: boolean;
  autoRead: boolean;
  engine: 'gemini' | 'browser';
  gender: 'female' | 'male';
  rate: number; // 0.5 to 2
  volume: number; // 0 to 1
}

export interface QuizConfig {
  mode: TopicMode;
  subTopic?: string;
  specificTopic?: string; // Para TopicMode.OTHER

  difficulty: Difficulty;
  temperature: number;
  quizFormat: QuizFormat;
  openEndedMode?: 'normal' | 'live';
  count: number;
  timeLimit: number;
  maxHints: number;
  hintTypes: HintType[];
  enableTimer: boolean;
  enableTimerSound: boolean;

  isTeamMode: boolean;
  teams: string[];
  questionsPerRound: number;

  tts: TTSConfig;
  // Histórico para evitar repetições
  usedTopics?: string[];

  // Configuração de Libras (Geração de Glosa)
  librasEnabled?: boolean;

  // System prompt customizado injetado pelo app consumidor (ex: JW Quiz)
  systemPrompt?: string;

  // Modos de tópico com rótulos amigáveis passados pelas configurações dos apps
  topicModes?: Array<{ value: string; label: string }>;
}

export interface GeneratedQuiz {
  title: string;
  questions: QuizQuestion[];
  keywords: string[]; // Palavras-chave temáticas dinâmicas para aumentar a entropia nas próximas gerações
  focalTheme?: string;
}

export interface EvaluationResult {
  score: number; // Pontuação de 0.0 a 1.0
  feedback: string;
  isCorrect: boolean;
}

export interface ApiErrorDetail {
  title: string;
  message: string;
  solution: string;
  code: string;
}

export type AiProvider = 'auto' | 'google-ai' | 'vertex' | 'deepseek' | 'groq' | 'openrouter' | 'openai' | 'claude';

export type TelemetryEventType = 
  | 'app_accessed'
  | 'session_start'
  | 'error' 
  | 'quiz_generated' 
  | 'question_answered' 
  | 'question_skipped' 
  | 'question_voided' 
  | 'hint_used'
  | 'ai_chat_response';

export interface TelemetryLogEntry {
  id?: string;
  eventType: TelemetryEventType;
  appName: string;
  timestamp?: any;
  isoDate?: string;
  title?: string;
  topic?: string;
  subTopic?: string;
  errorCode?: string;
  errorMessage?: string;
  solution?: string;
  questionId?: string;
  questionText?: string;
  selectedIndex?: number | null;
  isCorrect?: boolean;
  score?: number;
  userEmail?: string | null;
  userAgent?: string;
  /** Identificador do provedor e modelo de IA utilizado (ex: "groq/llama-3.3-70b-versatile") */
  aiModel?: string;
  /** Tokens de entrada (prompt) consumidos na chamada da LLM */
  promptTokens?: number;
  /** Tokens de saída (resposta/completion) gerados pela LLM */
  completionTokens?: number;
  /** Total de tokens consumidos na requisição da LLM */
  totalTokens?: number;
  /** Duração em milissegundos para concluir a chamada de IA */
  durationMs?: number;
  /** Firebase Anonymous UID — identifica o dispositivo/usuário de forma persistente sem cadastro */
  anonymousUid?: string | null;
  /** Identificador único do cliente/navegador (estilo GA4 / MS Clarity UUID v4) */
  clientId?: string | null;
}

export interface AppConfig {
  appName: string;
  storagePrefix: string;
  themeColors: {
    primary: string;
  };
  promptProfile: {
    systemInstruction: string;
  };
  setupTopics: {
    id: string;
    label: string;
    icon?: any;
    subtopics?: string[];
    subtopicsLabel?: string;
    hasCustomInput?: boolean;
    customInputLabel?: string;
    customInputPlaceholder?: string;
  }[];
}

