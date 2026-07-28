import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult, TTSConfig, AiProvider, shuffleQuizOptions, shuffleQuestionOptions } from "@avalia/core";
import { getQuestionReadAloudText } from "./tts";
import { PROMPTS } from "@avalia/core";
import { buildQuizPrompt } from "@avalia/ai-prompts";
import { logTelemetryEvent } from "./firebase";

/**
 * Formata mensagens de erro HTTP cruas da API em texto amigável em Português.
 */
const parseApiErrorMessage = (errorText: string, status: number): string => {
  let cleanMsg = errorText;
  try {
    const parsed = JSON.parse(errorText);
    cleanMsg = parsed?.error?.message || parsed?.message || parsed?.error || errorText;
    if (typeof cleanMsg === 'object') {
      cleanMsg = JSON.stringify(cleanMsg);
    }
  } catch {
    // mantém a string original se não for JSON
  }

  const lowerMsg = String(cleanMsg).toLowerCase();
  if (lowerMsg.includes('no :free endpoints') || lowerMsg.includes('no free endpoints') || lowerMsg.includes('no endpoints available')) {
    return 'Servidores gratuitos do OpenRouter temporariamente sem capacidade. Tente novamente em alguns segundos ou escolha outro provedor.';
  }
  if (status === 402 || lowerMsg.includes('insufficient balance') || lowerMsg.includes('insufficient_balance')) {
    return 'Saldo insuficiente na conta do provedor de IA.';
  }
  if (status === 429 || lowerMsg.includes('rate limit') || lowerMsg.includes('quota')) {
    return 'Limite de requisições ou quota excedida no provedor de IA.';
  }
  if (status === 403 || status === 401 || lowerMsg.includes('invalid api key') || lowerMsg.includes('api key not valid')) {
    return 'Chave de API inválida ou sem permissão de acesso.';
  }
  if (status >= 500) {
    return 'Servidor do provedor de IA temporariamente indisponível.';
  }

  return cleanMsg ? String(cleanMsg).slice(0, 300) : `Erro de requisição (HTTP ${status})`;
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
  const p = provider as AiProvider;
  const effectiveProvider = p === 'auto' ? 'openrouter' : p;
  
  if (specificModel.startsWith(`${effectiveProvider}/`)) {
    return specificModel;
  }
  
  return `${effectiveProvider}/${specificModel}`;
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

export const validateApiKey = async (apiKey: string, provider: AiProvider, model: string): Promise<boolean> => {
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

        if (response.status === 401) {
          throw new Error(`Chave de API incorreta ou inativa no ${displayName}.`);
        }
        if (response.status === 402) {
          throw new Error(`Saldo insuficiente ou pagamento exigido no ${displayName}. Adicione créditos para continuar.`);
        }
        if (response.status === 429) {
          throw new Error(`Limite de requisições excedido ou quota zerada no ${displayName}. Aguarde alguns instantes.`);
        }

        if (apiMessage) {
          const lowerMsg = apiMessage.toLowerCase();
          if (lowerMsg.includes('no :free endpoints') || lowerMsg.includes('no free endpoints') || lowerMsg.includes('no endpoints available')) {
            throw new Error("Servidores gratuitos do OpenRouter temporariamente ocupados. Aguarde alguns segundos ou altere o provedor.");
          }
          throw new Error(`Erro da API do ${displayName}: ${apiMessage}`);
        }
        throw new Error(`Erro na API do ${displayName} (${response.status}): ${errorText}`);
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

  if (provider === 'google-ai' || provider === 'vertex') {
    try {
      const genAI = getSDKInstance(apiKey);
      const result = await genAI.models.generateContent({
        model: model,
        contents: [{ role: "user", parts: [{ text: "Reply 'OK'." }] }]
      });
      return !!result.text;
    } catch (error: any) {
      console.error("Google AI Validation Error:", error);
      throw new Error(error.message || "Chave incorreta ou inativa. O Google recusou a conexão.");
    }
  }

  throw new Error(`Provedor de IA desconhecido: '${provider}'.`);
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
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error(`Falha ao obter resposta da API do ${displayName}.`);

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

  // Google GenAI SDK (google-ai ou vertex)
  const genAI = getSDKInstance(apiKey);
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

  const text = result.text;
  if (!text) throw new Error("Resposta vazia da API do Google AI.");

  const raw = cleanJson(text);
  const parsedPt = JSON.parse(raw);

  const parsed: GeneratedQuiz = {
    title: parsedPt.titulo || "Quiz",
    keywords: parsedPt.palavrasChave || [],
    focalTheme: parsedPt.palavrasChave?.[0] || "Dinâmico",
    questions: (parsedPt.perguntas || []).map((p: any) => ({
      id: p.id,
      question: p.enunciado,
      options: p.opcoes,
      correctAnswerIndex: p.indiceRespostaCorreta,
      correctAnswerText: p.textoRespostaCorreta,
      reference: p.referencia,
      explanation: p.justificativa,
      glosa: p.glosa,
      hint: p.dica
    }))
  };

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

  const effectiveProvider = provider === 'auto' ? 'openrouter' : provider;

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
      solution: 'Verifique se a Chave de API está correta e ativa',
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

  const effectiveProvider = provider === 'auto' ? 'openrouter' : provider;
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
  try {
    const cleaned = cleanJson(rawText || "{}");
    const parsed = JSON.parse(cleaned);
    const score = typeof parsed.score === 'number'
      ? parsed.score
      : (typeof parsed.pontuacao === 'number' ? parsed.pontuacao : (parsed.isCorrect ? 1.0 : 0.0));
    const isCorrect = typeof parsed.isCorrect === 'boolean'
      ? parsed.isCorrect
      : (score >= 0.6);
    const feedback = parsed.feedback || parsed.comentario || (isCorrect ? 'Resposta aceitável.' : 'Resposta incorreta.');
    return { score, feedback, isCorrect };
  } catch (e) {
    console.error("Evaluation Result Parse Error:", e, "Raw Text:", rawText);
    return { score: 0, feedback: "Não foi possível avaliar a resposta automaticamente.", isCorrect: false };
  }
};

const fallbackEvaluate = (question: string, modelAnswer: string, userAnswer: string): EvaluationResult => {
  const normUser = userAnswer.trim().toLowerCase();
  const normModel = modelAnswer.trim().toLowerCase();

  if (normModel && (normUser.includes(normModel) || normModel.includes(normUser))) {
    return { score: 1.0, isCorrect: true, feedback: "Resposta avaliada como correta." };
  }

  if (normUser.length > 2 && normModel) {
    const modelWords = normModel.split(/\s+/).filter(w => w.length > 3);
    const match = modelWords.some(w => normUser.includes(w));
    if (match) {
      return { score: 0.8, isCorrect: true, feedback: "Resposta avaliada como parcialmente correta." };
    }
  }

  const isCorrect = normUser.length > 3 && !normModel;
  return {
    score: isCorrect ? 0.8 : 0.0,
    isCorrect,
    feedback: isCorrect ? "Resposta registrada." : (normModel ? `Resposta esperada: "${modelAnswer}".` : "Resposta incorreta.")
  };
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
        console.error(`${displayName} API Error:`, response.status, await response.text());
        return fallbackEvaluate(question, modelAnswer, userAnswer);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      return parseEvaluationResult(text || "{}");
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
    return parseEvaluationResult(text || "{}");
  } catch (error) {
    console.error("evaluateFreeResponse AI Error, applying fallback:", error);
    return fallbackEvaluate(question, modelAnswer, userAnswer);
  }
};

export const askAiAboutQuestion = async (apiKey: string, question: QuizQuestion, userQuery: string, provider: AiProvider, model: string, appName: string): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  if (!provider) throw new Error("Provedor de IA não informado.");
  if (!model) throw new Error("Modelo de IA não informado.");

  if (provider === 'openai' || provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    const prompt = `Dúvida do jogador sobre a questão: ${question.question}. O usuário pergunta: "${userQuery}". Responda de forma rápida e instrutiva.`;

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
      headers: getFetchHeaders(apiKey, provider, appName),
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const friendlyMsg = parseApiErrorMessage(errorText, response.status);
      const fullErrorMsg = `Erro na API do ${displayName}: ${response.status} - ${friendlyMsg}`;
      logApiErrorToTelemetry(displayName, response.status, fullErrorMsg, appName);
      console.error(`${displayName} API Error:`, response.status, errorText);
      throw new Error(fullErrorMsg);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Sem resposta.";
  }

  const genAI = getSDKInstance(apiKey);
  const prompt = `Dúvida do jogador sobre a questão: ${question.question}. O usuário pergunta: "${userQuery}". Responda de forma rápida e instrutiva.`;

  const result = await genAI.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  return result.text || "Sem resposta.";
};

export const generateSpeech = async (apiKey: string, text: string, config: TTSConfig, provider: AiProvider = 'google-ai'): Promise<string | null> => {
  if (!apiKey) return null;
  const ttsModel = getTtsModel();

  // Suporte a OpenAI TTS
  if (provider === 'openai' || ttsModel.startsWith('tts-') || ttsModel.includes('gpt-4o-mini-tts')) {
    const voice = config.gender === 'male' ? 'onyx' : 'coral';
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: ttsModel || 'gpt-4o-mini-tts',
          input: text,
          voice: voice
        })
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error("[TTS/OpenAI] Erro na chamada de áudio:", errJson);
        return null;
      }
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (error) {
      console.error("[TTS/OpenAI] Falha ao gerar áudio:", error);
      return null;
    }
  }

  if (provider === 'deepseek' || provider === 'groq' || provider === 'openrouter') {
    return null;
  }

  const genAI = getSDKInstance(apiKey);
  const voiceName = config.gender === 'male' ? 'Fenrir' : 'Kore';
  try {
    const result = await genAI.models.generateContent({
      model: ttsModel,
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    });
    return (result as any).data || null;
  } catch (error) {
    console.error("[TTS/Gemini] Falha ao gerar áudio:", error);
    return null;
  }
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

