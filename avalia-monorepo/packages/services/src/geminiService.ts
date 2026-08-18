import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult, TTSConfig, AiProvider, shuffleQuizOptions, shuffleQuestionOptions } from "@avalia/core";
import { getQuestionReadAloudText } from "./tts";
import { PROMPTS } from "@avalia/core";
import { buildQuizPrompt, parseQuizResponse } from "@avalia/ai-prompts";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, logTelemetryEvent, getClientId } from "./firebase";

export const COMPATIBILITY_CONTRACT_VERSION = 'v1';

export type ModelCompatibilityState = 'compatible' | 'incompatible' | 'untested';

/**
 * Le o status de compatibilidade armazenado no localStorage para um par provider + model.
 * Retorna:
 * - 'Incompatível' se foi comprovadamente incompatível com o contrato estruturado
 * - '' (string vazia) se foi testado com sucesso (compatível)
 * - 'Não testado' se nunca foi testado
 */
export const getStoredModelCompatibility = (provider: string, model: string): { state: ModelCompatibilityState; statusTag: string } => {
  if (typeof localStorage === 'undefined' || !provider || !model) {
    return { state: 'untested', statusTag: 'Não testado' };
  }

  const cleanModel = model.replace(/^models\//, '');
  const cleanProvider = provider.includes('google') ? 'google-ai' : provider;
  const storageKey = `avalia_compat:${COMPATIBILITY_CONTRACT_VERSION}:${cleanProvider}:${cleanModel}`;
  const stored = localStorage.getItem(storageKey);

  if (stored === 'incompatible') {
    return { state: 'incompatible', statusTag: 'Incompatível' };
  }
  if (stored === 'compatible') {
    return { state: 'compatible', statusTag: '' };
  }

  return { state: 'untested', statusTag: 'Não testado' };
};

/**
 * Grava a compatibilidade confirmada no localStorage e Firestore para disponibilidade imediata e multiplataforma.
 */
export const recordModelCompatibilityStatus = (provider: string, model: string, status: 'compatible' | 'incompatible'): void => {
  if (!provider || !model) return;

  const cleanModel = model.replace(/^models\//, '');
  const cleanProvider = provider.includes('google') ? 'google-ai' : provider;
  
  if (typeof localStorage !== 'undefined') {
    const storageKey = `avalia_compat:${COMPATIBILITY_CONTRACT_VERSION}:${cleanProvider}:${cleanModel}`;
    localStorage.setItem(storageKey, status);
  }

  // Persiste no Firestore para refletir entre todos os modos e dispositivos
  const docId = `${cleanProvider}_${cleanModel}_v1`;
  try {
    setDoc(doc(db, "modelCompatibility", docId), {
      provider: cleanProvider,
      model: cleanModel,
      contractVersion: COMPATIBILITY_CONTRACT_VERSION,
      status,
      reasonCode: null,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
  } catch { }
};

/**
 * Formata mensagens de erro HTTP cruas da API em texto amigável em Português.
 */
const parseApiErrorMessage = (errorText: string, status: number | string): string => {
  let cleanMsg = errorText;
  try {
    const parsed = typeof errorText === 'string' ? JSON.parse(errorText) : errorText;
    cleanMsg = parsed?.error?.message || parsed?.message || parsed?.error || errorText;
    if (typeof cleanMsg === 'object') {
      cleanMsg = JSON.stringify(cleanMsg);
    }
  } catch {
    // mantém a string original se não for JSON
  }

  const lowerMsg = String(cleanMsg).toLowerCase();
  const lowerFullStr = String(errorText).toLowerCase();

  // Tratamento amigável para modelo não encontrado / não suportado (HTTP 404)
  if (status === 404 || status === '404' || lowerMsg.includes('not found') || lowerMsg.includes('is not found') || lowerFullStr.includes('404')) {
    const modelMatch = String(errorText).match(/'([^']+)'|models\/([a-zA-Z0-9.\-_]+)/);
    const modelName = modelMatch ? (modelMatch[1] || modelMatch[2]) : '';
    return modelName 
      ? `O modelo de IA "${modelName}" não está disponível ou foi descontinuado pelo provedor. Selecione outro modelo nas configurações.`
      : 'O modelo de IA selecionado não está disponível ou foi descontinuado. Por favor, escolha outro modelo nas configurações.';
  }

  if (lowerMsg.includes('quota exceeded') || lowerMsg.includes('resource_exhausted') || lowerMsg.includes('rate_limit') || lowerMsg.includes('free_tier_requests')) {
    return 'Cota ou limite de requisições excedido no provedor. Por favor, aguarde alguns segundos ou selecione outro modelo/provedor.';
  }
  if (lowerMsg.includes('no :free endpoints') || lowerMsg.includes('no free endpoints') || lowerMsg.includes('no endpoints available')) {
    return 'Servidores gratuitos do OpenRouter temporariamente sem capacidade. Tente novamente em alguns segundos ou escolha outro provedor.';
  }
  if (status === 402 || status === '402' || lowerMsg.includes('insufficient balance') || lowerMsg.includes('insufficient_balance') || lowerMsg.includes('credit balance is too low') || lowerMsg.includes('purchase credits')) {
    return 'Saldo insuficiente na conta da API. Acesse o painel do seu provedor para adicionar créditos.';
  }
  if (status === 429 || status === '429') {
    return 'Limite de requisições excedido no provedor de IA. Aguarde alguns instantes.';
  }
  if (status === 403 || status === 401 || status === '403' || status === '401' || lowerMsg.includes('invalid api key') || lowerMsg.includes('api key not valid')) {
    return 'Chave de API inválida ou sem permissão de acesso. Verifique sua chave nas configurações.';
  }
  if (typeof status === 'number' && status >= 500) {
    return 'Servidor do provedor de IA temporariamente indisponível. Tente novamente em alguns instantes.';
  }

  // Remove formatação JSON / HTTP bruta da mensagem se restou
  const sanitized = String(cleanMsg)
    .replace(/^Falha ao validar modelo preconfigurado no Firestore '[^']+':\s*/, '')
    .replace(/HTTP \d+\.?\s*/g, '')
    .replace(/\{"error":\s*\{.*\}\}/g, '')
    .trim();

  return sanitized.length > 5 ? sanitized : 'Ocorreu um erro de comunicação com o provedor de IA. Tente novamente.';
};

/**
 * Registra o evento de erro de API na telemetria do Firestore e localStorage.
 */
const logApiErrorToTelemetry = (provider: string, status: number | string, message: string, appName: string) => {
  try {
    logTelemetryEvent({
      eventType: 'error',
      errorCode: String(status),
      errorMessage: message,
      aiModel: provider,
      appName
    });
  } catch (e) {
    console.warn("Falha ao gravar erro na telemetria:", e);
  }
};

/**
 * Helper para obter a instância do SDK configurada para o provedor correto.
 */
const getSDKInstance = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

const getFetchHeaders = (apiKey: string, provider: AiProvider, appName?: string) => {
  if (provider === 'claude') {
    return {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };
  if (provider === 'openrouter' && appName) {
    headers["X-Title"] = appName;
  }
  return headers;
};

/**
 * Busca dinamicamente os modelos disponíveis na API do Claude (GET /v1/models)
 */
export const fetchClaudeModels = async (apiKey: string): Promise<{ value: string; label: string; status?: string }[]> => {
  if (!apiKey || !apiKey.trim()) return [];
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      method: "GET",
      headers: {
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data && Array.isArray(data.data)) {
      const models = data.data.map((m: any) => ({
        value: m.id,
        label: m.display_name || m.id
      }));

      return models.sort((a: any, b: any) => {
        const extractVersion = (str: string): number => {
          const match = str.match(/(\d+(?:\.\d+)?)/);
          return match ? parseFloat(match[1]) : 0;
        };

        const verA = extractVersion(a.label || a.value);
        const verB = extractVersion(b.label || b.value);

        if (verB !== verA) {
          return verB - verA;
        }

        const getFamilyRank = (str: string): number => {
          const s = str.toLowerCase();
          if (s.includes('fable')) return 4;
          if (s.includes('sonnet')) return 3;
          if (s.includes('opus')) return 2;
          if (s.includes('haiku')) return 1;
          return 0;
        };

        const rankA = getFamilyRank(a.label || a.value);
        const rankB = getFamilyRank(b.label || b.value);

        if (rankB !== rankA) {
          return rankB - rankA;
        }

        return b.label.localeCompare(a.label, undefined, { numeric: true, sensitivity: 'base' });
      });
    }
  } catch (e) {
    console.warn("Erro ao buscar modelos dinâmicos do Claude:", e);
  }
  return [];
};

/**
 * Busca dinamicamente os modelos disponíveis em tempo real para qualquer provedor suportado.
 */
export const fetchDynamicModels = async (
  provider: AiProvider, 
  apiKey: string, 
  target: 'text' | 'tts' = 'text'
): Promise<{ value: string; label: string; status?: string }[]> => {
  if (!apiKey || !apiKey.trim()) return [];
  const key = apiKey.trim();

  try {
    if (provider === 'claude') {
      if (target === 'tts') return [];
      return await fetchClaudeModels(key);
    }

    if (provider === 'google-ai' || provider === 'vertex') {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data && Array.isArray(data.models)) {
        let defaultModel = '';
        const compatMap = new Map<string, { status: string; reasonCode?: string }>();
        let textExcludedPatterns: string[] = [];
        try {
          const configSnap = await getDoc(doc(db, "auth", "config"));
          if (configSnap.exists()) {
            const data = configSnap.data();
            defaultModel = target === 'tts' 
              ? (data.admin_tts_model || data.admin_model_google_ai || '')
              : (data.admin_model_google_ai || '');
          }

          const compatSnap = await getDocs(query(collection(db, "modelCompatibility"), where("contractVersion", "==", "v1")));
          compatSnap.forEach(docSnap => {
            const d = docSnap.data();
            if (d.model && d.status) {
              const targetModel = String(d.model).replace(/^models\//, '');
              compatMap.set(targetModel, { status: d.status, reasonCode: d.reasonCode });
            }
          });

          const exclusionsSnap = await getDoc(doc(db, "settings", "model_exclusions"));
          if (exclusionsSnap.exists()) {
            const exclusionsData = exclusionsSnap.data();
            if (Array.isArray(exclusionsData.text_excluded_patterns)) {
              textExcludedPatterns = exclusionsData.text_excluded_patterns.map((p: any) => String(p).toLowerCase());
            } else {
              console.error("[fetchDynamicModels] settings/model_exclusions existe mas text_excluded_patterns não é um array.");
            }
          } else {
            console.error("[fetchDynamicModels] Documento settings/model_exclusions não encontrado no Firestore. Nenhum padrão de exclusão aplicado.");
          }
        } catch (err) {
          console.error("[fetchDynamicModels] Erro ao buscar configurações do Firestore:", err);
        }

        const TTS_PATTERNS = ['tts', 'audio', 'speech'];

        const models = data.models
          .filter((m: any) => {
            if (!m.name) return false;
            const nameLower = m.name.toLowerCase();
            const isTts = TTS_PATTERNS.some(p => nameLower.includes(p));
            if (target === 'tts') return isTts;
            
            const isNonText = isTts || textExcludedPatterns.some(p => nameLower.includes(p));

            if (isNonText) return false;
            return m.supportedGenerationMethods?.includes('generateContent');
          })
          .map((m: any) => {
            const cleanId = m.name.replace(/^models\//, '');
            const isConfiguredDefault = defaultModel && cleanId === defaultModel;
            const firestoreCompat = compatMap.get(cleanId);
            const localCompat = getStoredModelCompatibility(provider, cleanId);
            const isShutdown = firestoreCompat?.reasonCode === 'DEPRECATED_SHUTDOWN';
            
            const isCompatible = firestoreCompat?.status === 'compatible' || localCompat.state === 'compatible';
            const isIncompatible = isShutdown || firestoreCompat?.status === 'incompatible' || localCompat.state === 'incompatible';
            const isBlocked = isIncompatible;

            let displayStatus = 'Não testado';
            if (isConfiguredDefault) {
              displayStatus = isShutdown ? 'Padrão · Shutdown' : (isBlocked ? 'Padrão · Incompatível' : 'Padrão');
            } else if (isShutdown) {
              displayStatus = 'Shutdown';
            } else if (isCompatible) {
              displayStatus = ''; // Sem tag para testados e compativeis
            } else if (isIncompatible) {
              displayStatus = 'Incompatível';
            }

            const rank = isConfiguredDefault ? 0 : (isCompatible ? 1 : (isShutdown || isIncompatible ? 3 : 2));
            return {
              value: cleanId,
              label: m.displayName ? `${m.displayName} (${cleanId})` : cleanId,
              status: displayStatus || undefined,
              isBlocked,
              isDefault: isConfiguredDefault,
              rank
            };
          });

        return models.sort((a: any, b: any) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          return b.label.localeCompare(a.label, undefined, { numeric: true, sensitivity: 'base' });
        });
      }
    }

    if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
      const url = provider === 'openai'
        ? "https://api.openai.com/v1/models"
        : provider === 'deepseek'
          ? "https://api.deepseek.com/models"
          : provider === 'groq'
            ? "https://api.groq.com/openai/v1/models"
            : "https://openrouter.ai/api/v1/models";

      const headers = getFetchHeaders(key, provider);
      const res = await fetch(url, { method: "GET", headers });
      if (!res.ok) return [];
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        let defaultModel = '';
        const compatMap = new Map<string, { status: string; reasonCode?: string }>();
        try {
          const configSnap = await getDoc(doc(db, "auth", "config"));
          if (configSnap.exists()) {
            const confData = configSnap.data();
            const slug = provider === 'openai' ? 'openai' : provider;
            defaultModel = confData[`admin_model_${slug}`] || '';
          }

          const compatSnap = await getDocs(query(collection(db, "modelCompatibility"), where("contractVersion", "==", "v1")));
          compatSnap.forEach(docSnap => {
            const d = docSnap.data();
            if (d.model && d.status) {
              const targetModel = String(d.model).replace(/^models\//, '');
              compatMap.set(targetModel, { status: d.status, reasonCode: d.reasonCode });
            }
          });
        } catch { }

        const models = data.data
          .filter((m: any) => {
            if (!m.id) return false;
            const idLower = m.id.toLowerCase();
            const isTts = idLower.includes('tts') || idLower.includes('audio') || idLower.includes('realtime') || idLower.includes('whisper') || idLower.includes('speech');
            if (target === 'tts') return isTts;
            if (isTts) return false;

            const isNonText = idLower.includes('dall-e') || 
              idLower.includes('image') || 
              idLower.includes('embed') || 
              idLower.includes('moderation') || 
              idLower.includes('transcription') || 
              idLower.includes('rerank');

            if (isNonText) return false;

            if (provider === 'openai') {
              return idLower.startsWith('gpt') || idLower.startsWith('o1') || idLower.startsWith('o3');
            }
            return true;
          })
          .map((m: any) => {
            const cleanId = m.id;
            const isConfiguredDefault = defaultModel && cleanId === defaultModel;
            const firestoreCompat = compatMap.get(cleanId);
            const localCompat = getStoredModelCompatibility(provider, cleanId);
            
            const isCompatible = firestoreCompat?.status === 'compatible' || localCompat.state === 'compatible';
            const isIncompatible = firestoreCompat?.status === 'incompatible' || localCompat.state === 'incompatible';
            const isBlocked = isIncompatible;

            let displayStatus = 'Não testado';
            if (isConfiguredDefault) {
              displayStatus = isBlocked ? 'Padrão · Incompatível' : 'Padrão';
            } else if (isCompatible) {
              displayStatus = ''; // Sem tag para testados e compativeis
            } else if (isIncompatible) {
              displayStatus = 'Incompatível';
            }

            const rank = isConfiguredDefault ? 0 : (isCompatible ? 1 : (isIncompatible ? 3 : 2));
            let label = m.name || m.id;
            
            if (provider === 'openrouter') {
              const promptVal = m.pricing ? parseFloat(m.pricing.prompt || '0') : 0;
              const completionVal = m.pricing ? parseFloat(m.pricing.completion || '0') : 0;
              const isFree = (m.id && m.id.endsWith(':free')) || (promptVal === 0 && completionVal === 0);
              if (!displayStatus || displayStatus === 'Não testado') {
                if (isFree) displayStatus = 'Grátis';
              }
            }

            return {
              value: cleanId,
              label,
              status: displayStatus || undefined,
              isBlocked,
              isDefault: isConfiguredDefault,
              rank
            };
          });

        return models.sort((a: any, b: any) => {
          if (a.rank !== b.rank) return a.rank - b.rank;
          return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
        });
      }
    }
  } catch (e) {
    console.warn(`Erro ao buscar modelos dinâmicos do ${provider} (${target}):`, e);
  }
  return [];
};

/**
 * Retorna o label composto "provider/modelo" para fins de telemetria.
 * Exemplo: "groq/llama-3.3-70b-versatile", "openrouter/google/gemini-2.5-flash"
 */
export const resolveAiModelLabel = (provider: string, specificModel: string): string => {
  if (!provider) {
    throw new Error("Provedor de IA não informado.");
  }
  if (!specificModel) {
    throw new Error("Modelo de IA não informado.");
  }
  
  if (specificModel.startsWith(`${provider}/`)) {
    return specificModel;
  }
  
  return `${provider}/${specificModel}`;
};

const getTtsModel = (): string => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('gemini_tts_model') || "";
  }
  return "";
};

const cleanJson = (text: string): string => {
  if (!text) return "";
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
};

const getSystemInstruction = (librasEnabled?: boolean, customPrompt?: string) => `
${customPrompt || "Você é um assistente criador de quizzes educacionais. Siga estritamente as regras de formato."}

${librasEnabled ? glosaInstructions : ""}
`;

const glosaInstructions = `
6. TRADUÇÃO NEURAL PARA LIBRAS...
`;

const getTopicPrompt = (config: QuizConfig) => {
  if (config.mode === TopicMode.OTHER) {
    return `Tema Livre Obrigatório: "${config.specificTopic}".`;
  }
  return `Área: ${config.mode}. Subtema Específico: ${config.subTopic || 'Geral'}.`;
};

const getFormatInstruction = (config: QuizConfig) => {
  if (config.quizFormat === QuizFormat.TRUE_FALSE) return `FORMATO: VERDADEIRO OU FALSO. options: ["Verdadeiro", "Falso"]. IMPORTANTE: Distribua as respostas equilibradamente entre afirmativas verdadeiras (indiceRespostaCorreta: 0) e falsas (indiceRespostaCorreta: 1), aproximando de 50% para cada.`;
  if (config.quizFormat === QuizFormat.OPEN_ENDED) return `FORMATO: RESPOSTA LIVRE. options: []. correctAnswerIndex: -1. Preencha correctAnswerText.`;
  return `FORMATO: MÚLTIPLA ESCOLHA. 4 alternativas.`;
};

const validateApiKeyCore = async (apiKey: string, provider: AiProvider, model: string): Promise<boolean> => {
  if (!apiKey) return false;
  if (!model) throw new Error(`Modelo de IA para o provedor '${provider}' não foi fornecido.`);

  if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    const apiUrl = provider === 'openai'
      ? "https://api.openai.com/v1/chat/completions"
      : provider === 'deepseek'
        ? "https://api.deepseek.com/chat/completions"
        : provider === 'groq'
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";
    const displayName = provider === 'openai' ? "OpenAI" : provider === 'deepseek' ? "DeepSeek" : provider === 'groq' ? "Groq" : "OpenRouter";

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: getFetchHeaders(apiKey, provider),
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "user", content: "Reply 'OK'." }
          ],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`${displayName} validation failed:`, response.status, errorText);

        let apiMessage = "";
        try {
          const errObj = JSON.parse(errorText);
          apiMessage = errObj.error?.message || errObj.message || "";
        } catch (e) { }

        const friendlyMsg = parseApiErrorMessage(errorText, response.status);
        throw new Error(friendlyMsg);
      }

      const data = await response.json();
      return !!data.choices?.[0]?.message?.content;
    } catch (error: any) {
      console.error(`${displayName} Validation Error:`, error);
      if (error.message && (error.message.includes("Failed to fetch") || error.message.includes("fetch"))) {
        throw new Error(`Erro de conexão com o ${displayName}. Pode ser devido a restrições de CORS no navegador ou falta de internet.`);
      }
      throw error;
    }
  }

  if (provider === 'claude') {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: getFetchHeaders(apiKey, provider),
        body: JSON.stringify({
          model: model,
          messages: [{ role: "user", content: "Reply 'OK'." }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude validation failed:", response.status, errorText);
        let apiMessage = "";
        try {
          const errObj = JSON.parse(errorText);
          apiMessage = errObj.error?.message || errObj.message || "";
        } catch (e) { }

        const friendlyMsg = parseApiErrorMessage(errorText, response.status);
        throw new Error(friendlyMsg);
      }

      const data = await response.json();
      return !!(data.content && data.content[0]?.text);
    } catch (error: any) {
      console.error("Claude Validation Error:", error);
      if (error.message && (error.message.includes("Failed to fetch") || error.message.includes("fetch"))) {
        throw new Error("Erro de conexão com o Claude (Anthropic). Pode ser devido a restrições de CORS no navegador ou falta de internet.");
      }
      throw error;
    }
  }

  if (provider === 'google-ai' || provider === 'vertex') {
    try {
      const genAI = getSDKInstance(apiKey);
      const result = await genAI.models.generateContent({
        model: model,
        contents: [{ role: "user", parts: [{ text: "Reply 'OK'." }] }]
      });
      
      if (result.text) {
        const cleanModel = model.replace(/^models\//, '');
        const docId = `${provider}_${cleanModel}_v1`;
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          await setDoc(doc(db, "modelCompatibility", docId), {
            provider,
            model: cleanModel,
            contractVersion: "v1",
            status: "compatible",
            reasonCode: null,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch { }
      }

      return !!result.text;
    } catch (error: any) {
      console.error("Google AI Validation Error:", error);
      const friendlyMsg = parseApiErrorMessage(error.message || String(error), error.status || 429);
      throw new Error(friendlyMsg);
    }
  }

  throw new Error(`Provedor de IA desconhecido: '${provider}'.`);
};

/**
 * Valida a chave de API de um provedor de IA e emite evento de telemetria 'model_validation'.
 * A telemetria é fire-and-forget — erros de log não afetam o resultado da validação.
 */
export const validateApiKey = async (apiKey: string, provider: AiProvider, model: string, ttsModel?: string): Promise<boolean> => {
  const startTime = Date.now();
  try {
    const result = await validateApiKeyCore(apiKey, provider, model);

    // Se um modelo de TTS específico for informado, realiza também a validação do modelo de áudio
    if (result && ttsModel && ttsModel.trim()) {
      const cleanTtsModel = ttsModel.trim();
      if (provider === 'google-ai' || provider === 'vertex') {
        const genAI = getSDKInstance(apiKey);
        await genAI.models.generateContent({
          model: cleanTtsModel,
          contents: [{ role: "user", parts: [{ text: "Teste de voz" }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            }
          }
        });
        recordModelCompatibilityStatus('google-ai', cleanTtsModel, 'compatible');
      } else if (provider === 'openai') {
        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: getFetchHeaders(apiKey, provider),
          body: JSON.stringify({
            model: cleanTtsModel,
            input: "Teste de voz",
            voice: 'coral'
          })
        });
        if (!resp.ok) {
          const errText = await resp.text();
          const friendlyMsg = parseApiErrorMessage(errText, resp.status);
          throw new Error(`Validação do modelo TTS (${cleanTtsModel}): ${friendlyMsg}`);
        }
        recordModelCompatibilityStatus('openai', cleanTtsModel, 'compatible');
      }
    }

    logTelemetryEvent({
      eventType: 'model_validation',
      appName: 'system',
      aiModel: `${provider}/${model}${ttsModel ? ` (TTS: ${ttsModel})` : ''}`,
      errorCode: '200',
      durationMs: Date.now() - startTime
    }).catch(() => {});
    return result;
  } catch (error: any) {
    logTelemetryEvent({
      eventType: 'model_validation',
      appName: 'system',
      aiModel: `${provider}/${model}${ttsModel ? ` (TTS: ${ttsModel})` : ''}`,
      errorCode: 'error',
      errorMessage: error.message,
      durationMs: Date.now() - startTime
    }).catch(() => {});
    throw error;
  }
};

const executeSingleQuizRequest = async (
  apiKey: string,
  config: QuizConfig,
  globalExclusions: string[],
  provider: AiProvider,
  model: string,
  startTime: number,
  appName: string
): Promise<GeneratedQuiz> => {
  const prompt = buildQuizPrompt(config, globalExclusions);

  if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    const apiUrl = provider === 'openai'
      ? "https://api.openai.com/v1/chat/completions"
      : provider === 'deepseek'
        ? "https://api.deepseek.com/chat/completions"
        : provider === 'groq'
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";
    const displayName = provider === 'openai' ? "OpenAI" : provider === 'deepseek' ? "DeepSeek" : provider === 'groq' ? "Groq" : "OpenRouter";

    const payload: any = {
      model: model,
      messages: [
        { role: "system", content: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\nResponda APENAS em JSON." },
        { role: "user", content: prompt }
      ],
      temperature: config.temperature,
      response_format: { type: "json_object" }
    };

    let resp = await fetch(apiUrl, {
      method: "POST",
      headers: getFetchHeaders(apiKey, provider, appName),
      body: JSON.stringify(payload)
    });

    // Se falhar com 400 e response_format foi enviado, tenta novamente sem o response_format (muitos modelos no OpenRouter/Groq não aceitam esse parâmetro)
    if (!resp.ok && resp.status === 400 && payload.response_format) {
      delete payload.response_format;
      resp = await fetch(apiUrl, {
        method: "POST",
        headers: getFetchHeaders(apiKey, provider, appName),
        body: JSON.stringify(payload)
      });
    }

    if (!resp.ok) {
      const errorText = await resp.text();
      const friendlyMsg = parseApiErrorMessage(errorText, resp.status);
      throw new Error(`Erro na API do ${displayName} (${model}): ${resp.status} - ${friendlyMsg}`);
    }

    const data = await resp.json();

    const choiceError = data.choices?.[0]?.error?.message || data.error?.message;
    if (choiceError) {
      const friendlyMsg = parseApiErrorMessage(String(choiceError), resp.status);
      throw new Error(`Erro na API do ${displayName} (${model}): ${friendlyMsg}`);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text || !text.trim()) {
      throw new Error(`O modelo '${model}' do ${displayName} não retornou conteúdo. Os servidores gratuitos desse modelo podem estar temporariamente sobrecarregados no OpenRouter. Tente outro modelo.`);
    }

    const parsed: GeneratedQuiz = parseQuizResponse(text);

    const promptTokens = data.usage?.prompt_tokens;
    const completionTokens = data.usage?.completion_tokens;
    const totalTokens = data.usage?.total_tokens;

    // Para OpenRouter
    let actualAiModelLabel = `${provider}/${model}`;
    if (provider === 'openrouter') {
      const returnedModel = data.model || model;
      actualAiModelLabel = `openrouter/${returnedModel}`;
    }

    logTelemetryEvent({
      eventType: 'quiz_generated',
      errorCode: '200',
      appName,
      title: parsed.title,
      topic: config.mode,
      aiModel: actualAiModelLabel,
      clientId: getClientId(),
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs: Date.now() - startTime
    });

    return shuffleQuizOptions(parsed, config.quizFormat);
  }

  if (provider === 'claude') {
    const payload: any = {
      model: model,
      max_tokens: 4096,
      system: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\nResponda APENAS em JSON.",
      messages: [
        { role: "user", content: prompt }
      ],
      temperature: config.temperature
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: getFetchHeaders(apiKey, provider, appName),
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      const friendlyMsg = parseApiErrorMessage(errorText, resp.status);
      throw new Error(`Erro na API do Claude (${model}): ${resp.status} - ${friendlyMsg}`);
    }

    const data = await resp.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Falha ao obter resposta da API do Claude.");

    const raw = cleanJson(text);
    const parsedPt = JSON.parse(raw);

    const parsed: GeneratedQuiz = {
      title: parsedPt.titulo || "Quiz",
      keywords: parsedPt.palavrasChave || [],
      focalTheme: parsedPt.palavrasChave?.[0] || "Dinâmico",
      questions: (parsedPt.perguntas || []).map((p: any) => ({
        id: p.id || `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question: p.enunciado,
        options: p.opcoes || [],
        correctAnswerIndex: p.indiceRespostaCorreta ?? -1,
        correctAnswerText: p.textoRespostaCorreta,
        reference: p.referencia || "",
        explanation: p.justificativa || "",
        glosa: p.glosa || "",
        hint: p.dica || ""
      }))
    };

    const promptTokens = data.usage?.input_tokens;
    const completionTokens = data.usage?.output_tokens;
    const totalTokens = (promptTokens || 0) + (completionTokens || 0);

    logTelemetryEvent({
      eventType: 'quiz_generated',
      errorCode: '200',
      appName,
      title: parsed.title,
      topic: config.mode,
      aiModel: `claude/${model}`,
      clientId: getClientId(),
      promptTokens,
      completionTokens,
      totalTokens,
      durationMs: Date.now() - startTime
    });

    return shuffleQuizOptions(parsed, config.quizFormat);
  }

  // Google GenAI SDK (google-ai ou vertex)
  const genAI = getSDKInstance(apiKey);
  let result: any;
  try {
    result = await genAI.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\n\n" + prompt + "\n\nIMPORTANTE: Responda APENAS em JSON." }] }
      ],
      config: {
        temperature: config.temperature,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Representação de um quiz educacional",
          properties: {
            titulo: { type: Type.STRING, description: "O título cativante do quiz." },
            palavrasChave: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Termos principais que definem o foco temático." },
            perguntas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  enunciado: { type: Type.STRING },
                  opcoes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  indiceRespostaCorreta: { type: Type.INTEGER },
                  textoRespostaCorreta: { type: Type.STRING },
                  referencia: { type: Type.STRING },
                  justificativa: { type: Type.STRING },
                  glosa: { type: Type.STRING },
                  dica: { type: Type.STRING }
                },
                required: ["id", "enunciado", "opcoes", "indiceRespostaCorreta", "textoRespostaCorreta", "referencia", "justificativa", "glosa", "dica"]
              }
            }
          },
          required: ["titulo", "palavrasChave", "perguntas"]
        }
      }
    });
  } catch (sdkErr: any) {
    const errMsg = String(sdkErr?.message || sdkErr || '').toLowerCase();
    const isStructuralIncompat =
      errMsg.includes('only supports interactions api') ||
      errMsg.includes('responsemimetype') ||
      errMsg.includes('responseschema') ||
      errMsg.includes('not supported') ||
      errMsg.includes('json_object') ||
      (sdkErr?.status === 400) ||
      (sdkErr?.code === 400);

    if (isStructuralIncompat) {
      recordModelCompatibilityStatus(provider, model, 'incompatible');
      throw new Error(`O modelo '${model}' não é compatível com geração de quiz em formato estruturado. Modelo marcado como incompatível.`);
    }
    throw sdkErr;
  }

  const text = result.text;
  if (!text) throw new Error("Resposta vazia da API do Google AI.");

  const parsed: GeneratedQuiz = parseQuizResponse(text);

  const promptTokens = result.usageMetadata?.promptTokenCount;
  const completionTokens = result.usageMetadata?.candidatesTokenCount;
  const totalTokens = result.usageMetadata?.totalTokenCount;

  logTelemetryEvent({
    eventType: 'quiz_generated',
    errorCode: '200',
    appName,
    title: parsed.title,
    topic: config.mode,
    aiModel: `${provider}/${model}`,
    clientId: getClientId(),
    promptTokens,
    completionTokens,
    totalTokens,
    durationMs: Date.now() - startTime
  });

  return shuffleQuizOptions(parsed, config.quizFormat);
};

export const generateQuizContent = async (apiKey: string, config: QuizConfig, globalExclusions: string[] = [], provider: AiProvider, model: string, appName: string): Promise<GeneratedQuiz> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  if (!provider) throw new Error("Provedor de IA não informado.");
  if (!model) throw new Error("Modelo de IA não informado.");
  if (!appName) throw new Error("Nome do aplicativo não informado.");
  const startTime = Date.now();

  // 'auto' não deve chegar aqui: o modo Auto tem seu próprio fluxo via resolveAutoConnection no GameEngine.
  // Se chegar, é estado inválido — falha explícita em vez de substituir silenciosamente.
  if (provider === 'auto') {
    throw new Error("Provider 'auto' não é suportado em generateQuizContent. Use resolveAutoConnection antes de chamar esta função.");
  }
  const effectiveProvider = provider;

  // Se apiKey não for um token de API direto de cliente (ex: AIza... ou sk-...), encaminha via Cloud Function Proxy Serverless
  const isDirectApiKey = apiKey.startsWith("AIza") || apiKey.startsWith("sk-") || apiKey.startsWith("gsk_");
  
  if (!isDirectApiKey) {
    try {
      const functionUrl = "https://us-central1-avalia-jw-quiz.cloudfunctions.net/generateQuizProxy";
      const resp = await fetch(functionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secretCode: apiKey,
          provider: effectiveProvider,
          model,
          theme: config.mode,
          subTopic: config.subTopic || config.specificTopic,
          count: config.count,
          temperature: config.temperature,
          globalExclusions,
          usedTopics: (config.usedTopics || []).slice(0, 40),
          allowedPageDomains: (config as any).allowedPageDomains || []
        })
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro HTTP ${resp.status} na geração serverless.`);
      }

      const data = await resp.json();
      if (!data.quiz) throw new Error("O servidor proxy não retornou um quiz válido.");
      
      // Registra modelo como testado e compativel
      recordModelCompatibilityStatus(effectiveProvider, model, 'compatible');

      logTelemetryEvent({
        eventType: 'quiz_generated',
        errorCode: '200',
        appName,
        title: data.quiz.title,
        topic: config.mode,
        aiModel: `proxy/${effectiveProvider}/${model}`,
        clientId: getClientId(),
        durationMs: Date.now() - startTime
      });

      return shuffleQuizOptions(data.quiz, config.quizFormat);
    } catch (e: any) {
      console.error("Erro na geração via Cloud Function generateQuizProxy:", e);
      throw new Error(e.message || "Falha ao gerar quiz via servidor proxy.");
    }
  }

  try {
    return await executeSingleQuizRequest(apiKey, config, globalExclusions, effectiveProvider, model, startTime, appName);
  } catch (e: any) {
    const statusStr = e?.status || e?.code || '400';
    const friendlyMsg = parseApiErrorMessage(e?.message || String(e), statusStr);

    logTelemetryEvent({
      eventType: 'error',
      errorCode: String(statusStr),
      errorMessage: friendlyMsg,
      title: `Erro no Provedor ${effectiveProvider}`,
      solution: 'Tente novamente em alguns instantes ou selecione outro modelo de IA.',
      aiModel: `${effectiveProvider}/${model}`,
      appName
    });

    console.error(`Erro ao gerar quiz com ${effectiveProvider} (${model}):`, e);
    throw new Error(friendlyMsg);
  }
};

export const generateReplacementQuestion = async (apiKey: string, config: QuizConfig, avoidQuestionText: string, provider: AiProvider, model: string, appName: string): Promise<QuizQuestion> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  if (!provider) throw new Error("Provedor de IA não informado.");
  if (!model) throw new Error("Modelo de IA não informado.");
  if (!appName) throw new Error("Nome do aplicativo não informado.");

  if (provider === 'auto') {
    throw new Error("Provider 'auto' não é suportado em generateReplacementQuestion. Use resolveAutoConnection antes de chamar esta função.");
  }
  const effectiveProvider = provider;
  if (effectiveProvider === 'openai' || effectiveProvider === 'deepseek' || effectiveProvider === 'groq' || effectiveProvider === 'openrouter') {
    const topicPrompt = getTopicPrompt(config);
    const formatInstruction = getFormatInstruction(config);
    const prompt = `
      Gere uma nova pergunta para o tema: ${topicPrompt}. 
      Dificuldade: ${config.difficulty}. 
      NÃO repita esta ideia: "${avoidQuestionText}". 
      ${formatInstruction}
      
      A resposta deve ser um objeto JSON seguindo exatamente este formato:
      {
        "id": "Identificador único.",
        "enunciado": "Texto da pergunta.",
        "opcoes": ["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4"],
        "indiceRespostaCorreta": 0,
        "textoRespostaCorreta": "Texto da resposta correta.",
        "referencia": "Fonte que embasa a pergunta.",
        "justificativa": "A explicação.",
        "glosa": "Tradução para Libras.",
        "dica": "Dica curta."
      }
    `;

    const apiUrl = provider === 'openai'
      ? "https://api.openai.com/v1/chat/completions"
      : provider === 'deepseek'
        ? "https://api.deepseek.com/chat/completions"
        : provider === 'groq'
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";
    const displayName = provider === 'openai' ? "OpenAI" : provider === 'deepseek' ? "DeepSeek" : provider === 'groq' ? "Groq" : "OpenRouter";

    const payload: any = {
      model: model,
      messages: [
        { role: "system", content: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\nResponda APENAS em JSON." },
        { role: "user", content: prompt }
      ],
      temperature: config.temperature,
      response_format: { type: "json_object" }
    };

    let response = await fetch(apiUrl, {
      method: "POST",
      headers: getFetchHeaders(apiKey, provider, appName),
      body: JSON.stringify(payload)
    });

    if (!response.ok && response.status === 400 && payload.response_format) {
      delete payload.response_format;
      response = await fetch(apiUrl, {
        method: "POST",
        headers: getFetchHeaders(apiKey, provider, appName),
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      const friendlyMsg = parseApiErrorMessage(errorText, response.status);
      const fullErrorMsg = `Erro na API do ${displayName}: ${response.status} - ${friendlyMsg}`;
      logApiErrorToTelemetry(displayName, response.status, fullErrorMsg, appName);
      console.error(`${displayName} API Error:`, response.status, errorText);
      throw new Error(fullErrorMsg);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`Falha ao gerar pergunta de substituição com ${displayName}.`);

    try {
      const p = JSON.parse(cleanJson(text));
      const question: QuizQuestion = {
        id: `sub-${Date.now()}`,
        question: p.enunciado,
        options: p.opcoes || [],
        correctAnswerIndex: p.indiceRespostaCorreta ?? -1,
        correctAnswerText: p.textoRespostaCorreta,
        reference: p.referencia || "",
        explanation: p.justificativa || "",
        glosa: p.glosa || "",
        hint: p.dica || ""
      };
      return shuffleQuestionOptions(question);
    } catch (e) {
      throw new Error(`Erro ao processar substituição do ${displayName}.`);
    }
  }

  if (effectiveProvider === 'claude') {
    const topicPrompt = getTopicPrompt(config);
    const formatInstruction = getFormatInstruction(config);
    const prompt = `
      Gere uma nova pergunta para o tema: ${topicPrompt}. 
      Dificuldade: ${config.difficulty}. 
      NÃO repita esta ideia: "${avoidQuestionText}". 
      ${formatInstruction}
      
      A resposta deve ser um objeto JSON seguindo exatamente este formato:
      {
        "id": "Identificador único.",
        "enunciado": "Texto da pergunta.",
        "opcoes": ["Alternativa 1", "Alternativa 2", "Alternativa 3", "Alternativa 4"],
        "indiceRespostaCorreta": 0,
        "textoRespostaCorreta": "Texto da resposta correta.",
        "referencia": "Fonte que embasa a pergunta.",
        "justificativa": "A explicação.",
        "glosa": "Tradução para Libras.",
        "dica": "Dica curta."
      }
    `;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: getFetchHeaders(apiKey, effectiveProvider, appName),
      body: JSON.stringify({
        model: model,
        max_tokens: 2048,
        system: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\nResponda APENAS em JSON.",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const friendlyMsg = parseApiErrorMessage(errorText, response.status);
      const fullErrorMsg = `Erro na API do Claude: ${response.status} - ${friendlyMsg}`;
      logApiErrorToTelemetry("Claude", response.status, fullErrorMsg, appName);
      console.error("Claude API Error:", response.status, errorText);
      throw new Error(fullErrorMsg);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text;
    if (!text) throw new Error("Falha ao gerar pergunta de substituição com o Claude.");

    try {
      const p = JSON.parse(cleanJson(text));
      const question: QuizQuestion = {
        id: `sub-${Date.now()}`,
        question: p.enunciado,
        options: p.opcoes || [],
        correctAnswerIndex: p.indiceRespostaCorreta ?? -1,
        correctAnswerText: p.textoRespostaCorreta,
        reference: p.referencia || "",
        explanation: p.justificativa || "",
        glosa: p.glosa || "",
        hint: p.dica || ""
      };
      return shuffleQuestionOptions(question);
    } catch (e) {
      throw new Error("Erro ao processar substituição do Claude.");
    }
  }

  const genAI = getSDKInstance(apiKey);

  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  const prompt = `Gere uma nova pergunta para o tema: ${topicPrompt}. Dificuldade: ${config.difficulty}. NÃO repita esta ideia: "${avoidQuestionText}". ${formatInstruction}`;

  const result = await genAI.models.generateContent({
    model,
    contents: [
      { role: "user", parts: [{ text: getSystemInstruction(config.librasEnabled, config.systemPrompt) + "\n\n" + prompt + "\n\nIMPORTANTE: Responda APENAS em JSON." }] }
    ],
    config: {
      temperature: config.temperature,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        description: "Representação de uma única pergunta do quiz",
        properties: {
          id: { type: Type.STRING, description: "Identificador único." },
          enunciado: { type: Type.STRING, description: "Texto da pergunta." },
          opcoes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "As alternativas." },
          indiceRespostaCorreta: { type: Type.INTEGER, description: "O índice da resposta correta." },
          textoRespostaCorreta: { type: Type.STRING, description: "O texto da resposta correta." },
          referencia: { type: Type.STRING, description: "Fonte que embasa a pergunta." },
          justificativa: { type: Type.STRING, description: "A explicação." },
          glosa: { type: Type.STRING, description: "Tradução para Libras." },
          dica: { type: Type.STRING, description: "Dica curta." }
        },
        required: ["id", "enunciado", "opcoes", "indiceRespostaCorreta", "textoRespostaCorreta", "referencia", "justificativa", "glosa", "dica"]
      }
    }
  });

  const text = result.text;
  if (!text) throw new Error("Falha ao gerar pergunta.");
  try {
    const p = JSON.parse(cleanJson(text));
    const question: QuizQuestion = {
      id: `sub-${Date.now()}`,
      question: p.enunciado,
      options: p.opcoes,
      correctAnswerIndex: p.indiceRespostaCorreta,
      correctAnswerText: p.textoRespostaCorreta,
      reference: p.referencia,
      explanation: p.justificativa,
      glosa: p.glosa,
      hint: p.dica
    };
    return question;
  } catch (e) { throw new Error("Erro ao processar substituição."); }
};

const parseEvaluationResult = (rawText: string): EvaluationResult => {
  if (!rawText || !rawText.trim() || rawText.trim() === '{}') {
    throw new Error("IA retornou resposta vazia ou inválida para avaliação.");
  }
  const cleaned = cleanJson(rawText);
  const parsed = JSON.parse(cleaned); // lança SyntaxError se inválido — propagado ao chamador
  const score = typeof parsed.score === 'number'
    ? parsed.score
    : (typeof parsed.pontuacao === 'number' ? parsed.pontuacao : (parsed.isCorrect ? 1.0 : 0.0));
  const isCorrect = typeof parsed.isCorrect === 'boolean'
    ? parsed.isCorrect
    : (score >= 0.6);
  const feedback = parsed.feedback || parsed.comentario || (isCorrect ? 'Resposta aceitável.' : 'Resposta incorreta.');
  return { score, feedback, isCorrect };
};

export const evaluateFreeResponse = async (apiKey: string, question: string, modelAnswer: string, userAnswer: string, provider: AiProvider, model: string): Promise<EvaluationResult> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  if (!provider) throw new Error("Provedor de IA não informado.");
  if (!model) throw new Error("Modelo de IA não informado.");

  try {
    if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
      const prompt = `
        Avalie a resposta do jogador:
        Pergunta: "${question}"
        Gabarito esperado: "${modelAnswer}"
        Resposta do jogador: "${userAnswer}"
        
        A resposta deve ser um objeto JSON seguindo exatamente este formato:
        {
          "score": 0.8,
          "feedback": "Sua resposta foi boa, mas...",
          "isCorrect": true
        }
      `;

      const apiUrl = provider === 'openai'
        ? "https://api.openai.com/v1/chat/completions"
        : provider === 'deepseek'
          ? "https://api.deepseek.com/chat/completions"
          : provider === 'groq'
            ? "https://api.groq.com/openai/v1/chat/completions"
            : "https://openrouter.ai/api/v1/chat/completions";
      const displayName = provider === 'openai' ? "OpenAI" : provider === 'deepseek' ? "DeepSeek" : provider === 'groq' ? "Groq" : "OpenRouter";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: getFetchHeaders(apiKey, provider),
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: getSystemInstruction(false) + "\nResponda APENAS em JSON." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`${displayName} API Error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text || !text.trim()) {
        throw new Error(`${displayName} retornou resposta de avaliação vazia.`);
      }
      return parseEvaluationResult(text);
    }

    const genAI = getSDKInstance(apiKey);

    const prompt = `Avalie a resposta do jogador. Pergunta: "${question}". Gabarito esperado: "${modelAnswer}". Resposta do jogador: "${userAnswer}".`;

    const result = await genAI.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: getSystemInstruction(false) + "\n\n" + prompt + "\n\nIMPORTANTE: Responda APENAS em JSON." }] }
      ],
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          description: "Resultado da avaliação de resposta livre",
          properties: {
            score: { type: Type.NUMBER, description: "Pontuação de 0.0 a 1.0 (float)." },
            feedback: { type: Type.STRING, description: "Explicação didática sobre a avaliação." },
            isCorrect: { type: Type.BOOLEAN, description: "Indica se a resposta é aceitável." }
          },
          required: ["score", "feedback", "isCorrect"]
        }
      }
    });

    const text = result.text;
    if (!text || !text.trim()) {
      throw new Error("Google AI retornou resposta de avaliação vazia.");
    }
    return parseEvaluationResult(text);
  } catch (error: any) {
    // Não aplicar avaliação textual como substituto da IA — sempr propagar o erro real.
    // QuizCard tem tratamento explícito que exibe mensagem ao usuário.
    const msg = error?.message || String(error);
    console.error("evaluateFreeResponse falhou:", msg);
    throw new Error(msg);
  }
};

export const askAiAboutQuestion = async (
  apiKey: string, 
  question: QuizQuestion, 
  userQuery: string, 
  provider: AiProvider, 
  model: string, 
  appName: string = 'Avalia Quiz',
  chatHistory: { role: 'user' | 'assistant' | 'model'; content: string }[] = []
): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  if (!provider) throw new Error("Provedor de IA não informado.");
  if (!model || !model.trim()) throw new Error("Modelo de IA não informado.");

  const systemInstruction = `Você é o Mestre do Quiz. O jogador está tirando dúvidas sobre a seguinte questão:
- Pergunta: "${question.question}"
- Opções: ${question.options?.join(', ') || 'N/A'}
- Resposta Correta: "${question.options?.[question.correctAnswerIndex] || question.correctAnswerText || 'N/A'}"
- Explicação: "${question.explanation || 'N/A'}"

Responda às perguntas do usuário mantendo o contexto da conversa anterior, de forma rápida, carismática e instrutiva.`;

  if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    const apiUrl = provider === 'openai'
      ? "https://api.openai.com/v1/chat/completions"
      : provider === 'deepseek'
        ? "https://api.deepseek.com/chat/completions"
        : provider === 'groq'
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://openrouter.ai/api/v1/chat/completions";
    const displayName = provider === 'openai' ? "OpenAI" : provider === 'deepseek' ? "DeepSeek" : provider === 'groq' ? "Groq" : "OpenRouter";

    const formattedMessages = [
      { role: "system", content: systemInstruction },
      ...chatHistory.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : msg.role,
        content: msg.content
      })),
      { role: "user", content: userQuery }
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: getFetchHeaders(apiKey, provider, appName),
      body: JSON.stringify({
        model: model,
        messages: formattedMessages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const friendlyMsg = parseApiErrorMessage(errorText, response.status);
      const fullErrorMsg = `Erro na API do ${displayName}: ${friendlyMsg}`;
      logApiErrorToTelemetry(displayName, response.status, fullErrorMsg, appName);
      console.error(`${displayName} API Error:`, response.status, errorText);
      throw new Error(friendlyMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sem resposta.";
  }

  try {
    const genAI = getSDKInstance(apiKey);
    const formattedContents = [
      { role: 'user', parts: [{ text: `[INSTRUÇÃO DO SISTEMA]\n${systemInstruction}` }] },
      { role: 'model', parts: [{ text: 'Entendido! Como posso ajudar sobre esta questão?' }] },
      ...chatHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: userQuery }] }
    ];

    const result = await genAI.models.generateContent({
      model: model,
      contents: formattedContents
    });
    return result.text || "Sem resposta.";
  } catch (error: any) {
    const friendlyMsg = parseApiErrorMessage(error?.message || String(error), error?.status || 429);
    throw new Error(friendlyMsg);
  }
};

export const generateSpeech = async (apiKey: string, text: string, config: TTSConfig, provider: AiProvider = 'google-ai'): Promise<string | null> => {
  if (!apiKey) return null;
  const ttsModel = getTtsModel();

  // Suporte a OpenAI TTS
  if (provider === 'openai') {
    if (!ttsModel) return null;
    const voice = config.gender === 'male' ? 'onyx' : 'coral';

    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ttsModel,
          input: text,
          voice: voice
        })
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error(`[TTS/OpenAI] Erro no modelo ${ttsModel}:`, errJson);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const audioBase64 = btoa(binary);
      recordModelCompatibilityStatus('openai', ttsModel);
      return audioBase64;
    } catch (error) {
      console.error(`[TTS/OpenAI] Exceção no modelo ${ttsModel}:`, error);
      return null;
    }
  }

  if (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    return null;
  }

  if (!ttsModel) return null;

  const genAI = getSDKInstance(apiKey);
  const voiceName = config.gender === 'male' ? 'Fenrir' : 'Kore';

  // No modo dinâmico do provedor, busca a lista real de modelos retornados pela API
  let modelsToTry: string[] = ttsModel ? [ttsModel] : [];
  try {
    const fetchedDynamic = await fetchDynamicModels(provider, apiKey, 'tts');
    let validDynamic: string[] = [];
    if (fetchedDynamic && fetchedDynamic.length > 0) {
      validDynamic = fetchedDynamic
        .filter((m: any) => !m.isBlocked && m.value)
        .map((m: any) => m.value);
    }
    
    // Se a busca com filtro 'tts' não trouxer modelos suficientes, busca os modelos de geração de texto/multimodal oficiais da API
    if (validDynamic.length === 0) {
      const fetchedText = await fetchDynamicModels(provider, apiKey, 'text');
      if (fetchedText && fetchedText.length > 0) {
        validDynamic = fetchedText
          .filter((m: any) => !m.isBlocked && m.value)
          .map((m: any) => m.value);
      }
    }

    modelsToTry = Array.from(new Set([...modelsToTry, ...validDynamic].filter(Boolean)));
  } catch {
    modelsToTry = ttsModel ? [ttsModel] : [];
  }

  for (const currentModel of modelsToTry) {
    try {
      const result = await genAI.models.generateContent({
        model: currentModel,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          }
        }
      });
      const audioData = (result as any).data || null;
      if (audioData) {
        recordModelCompatibilityStatus('google-ai', currentModel);
        return audioData;
      }
    } catch (error) {
      console.warn(`[TTS/Gemini] Rejeição/cota no modelo ${currentModel}, buscando próximo modelo retornado pela API:`, error);
    }
  }

  return null;
};

export const preGenerateQuizAudio = async (apiKey: string, quiz: GeneratedQuiz, ttsConfig: TTSConfig, teamNames: string[] = [], provider: AiProvider = 'google-ai'): Promise<GeneratedQuiz> => {
  if (!apiKey) throw new Error("Chave de API ausente para geração de áudio por IA.");
  const updatedQuestions = [...quiz.questions];
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    let activeTeamName = teamNames.length > 0 ? teamNames[i % teamNames.length] : "";
    const textToRead = getQuestionReadAloudText(q, activeTeamName);
    
    const audioBase64 = await generateSpeech(apiKey, textToRead, ttsConfig, provider);
    if (!audioBase64) {
      throw new Error(`Falha ao gerar narração de IA para a pergunta ${i + 1}. Verifique a cota da API ou tente novamente.`);
    }
    updatedQuestions[i].audioBase64 = audioBase64;
  }
  return { ...quiz, questions: updatedQuestions };
}

