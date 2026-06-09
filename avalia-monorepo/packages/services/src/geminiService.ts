import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult, TTSConfig, AiProvider } from "@avalia/core";
import { getQuestionReadAloudText } from "./tts";
import { PROMPTS } from "@avalia/core";

/**
 * Helper para obter a instância do SDK configurada para o provedor correto.
 */
const getSDKInstance = (apiKey: string) => {
  return new GoogleGenAI({ apiKey });
};

const getTextModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini_text_model') || import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash";
  }
  return import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash";
};

const getTtsModel = (): string => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('gemini_tts_model') || "gemini-2.5-flash-preview-tts";
  }
  return "gemini-2.5-flash-preview-tts";
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
  if (config.quizFormat === QuizFormat.TRUE_FALSE) return `FORMATO: VERDADEIRO OU FALSO. options: ["Verdadeiro", "Falso"].`;
  if (config.quizFormat === QuizFormat.OPEN_ENDED) return `FORMATO: RESPOSTA LIVRE. options: []. correctAnswerIndex: -1. Preencha correctAnswerText.`;
  return `FORMATO: MÚLTIPLA ESCOLHA. 4 alternativas.`;
};

export const validateApiKey = async (apiKey: string, provider: AiProvider = 'google-ai'): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const genAI = getSDKInstance(apiKey);
    const result = await genAI.models.generateContent({
      model: getTextModel(),
      contents: [{ role: "user", parts: [{ text: "Reply 'OK'." }] }]
    });
    return !!result.text;
  } catch (error) {
    console.error("API Validation Error:", error);
    return false;
  }
};

export const generateQuizContent = async (apiKey: string, config: QuizConfig, globalExclusions: string[] = [], provider: AiProvider = 'google-ai'): Promise<GeneratedQuiz> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const genAI = getSDKInstance(apiKey);
  const model = getTextModel();
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);

  const allExclusions = Array.from(new Set([...(config.usedTopics || []), ...globalExclusions]));

  const exclusionList = allExclusions.length > 0
    ? `PROIBIDO: Não aborde temas diretamente relacionados a estas palavras-chave: ${allExclusions.join(', ')}.`
    : '';

  const prompt = `
    Crie um quiz com ${config.count} perguntas.
    Tema: ${topicPrompt}.
    Dificuldade Solicitada: ${config.difficulty} (Texto de leitura simples, dificuldade por profundidade de tema).
    ${formatInstruction}
    ${exclusionList}
    VARIAÇÃO: Escolha um subtema criativo e inovador dentro da área especificada.
    PALAVRAS-CHAVE: Ao final, extraia APENAS UM termo (keyword) principal que define o foco deste quiz para controle de entropia futura.
    REGRAS: Busque fatos curiosos e condizentes com a dificuldade solicitada. O título deve ser cativante.
  `;

  const result = await genAI.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      temperature: config.temperature,
      systemInstruction: getSystemInstruction(config.librasEnabled, config.systemPrompt),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        description: "Estrutura do quiz gerado",
        properties: {
          titulo: { type: Type.STRING, description: "O título cativante do quiz." },
          palavrasChave: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Termos principais que definem o foco temático." },
          perguntas: {
            type: Type.ARRAY,
            description: "Lista de perguntas do quiz.",
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING, description: "Identificador único da pergunta (UUID curto)." },
                enunciado: { type: Type.STRING, description: "O texto da pergunta." },
                opcoes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "As alternativas de resposta (deve ser um array vazio se Resposta Livre)." },
                indiceRespostaCorreta: { type: Type.INTEGER, description: "O índice (0 a 3) da resposta correta no array de opcoes (usar -1 para Resposta Livre)." },
                textoRespostaCorreta: { type: Type.STRING, description: "O texto da resposta correta." },
                referencia: { type: Type.STRING, description: "Fonte, link ou contexto que embasa a resposta correta." },
                justificativa: { type: Type.STRING, description: "A explicação do porquê a resposta está correta." },
                glosa: { type: Type.STRING, description: "Tradução adaptada para a estrutura gramatical da Língua Brasileira de Sinais." },
                dica: { type: Type.STRING, description: "Uma dica curta para ajudar o jogador." }
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
  if (!text) throw new Error("Falha ao gerar conteúdo.");
  try {
    const raw = cleanJson(text);
    const parsedPt = JSON.parse(raw);
    
    // Mapeamento do schema em Português para a interface interna GeneratedQuiz
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
    return parsed;
  } catch (e: any) {
    console.error("Gemini JSON Parse Error:", e, "Text:", text);
    throw new Error(`Erro ao processar JSON da IA: ${e?.message || 'Invalido'}.`);
  }
};

export const generateReplacementQuestion = async (apiKey: string, config: QuizConfig, avoidQuestionText: string, provider: AiProvider = 'google-ai'): Promise<QuizQuestion> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const genAI = getSDKInstance(apiKey);
  const model = getTextModel();
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

export const evaluateFreeResponse = async (apiKey: string, question: string, modelAnswer: string, userAnswer: string, provider: AiProvider = 'google-ai'): Promise<EvaluationResult> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const genAI = getSDKInstance(apiKey);
  const model = getTextModel();
  const prompt = `Avalie a resposta: Pergunta: "${question}", Gabarito: "${modelAnswer}", Jogador disse: "${userAnswer}". JSON: {score, feedback, isCorrect}`;

  const result = await genAI.models.generateContent({
    model,
    contents: [
      { role: "user", parts: [{ text: getSystemInstruction(false) + "\n\n" + prompt + "\n\nIMPORTANTE: Responda APENAS em JSON." }] }
    ],
    config: {
      temperature: 0.3,
      responseMimeType: "application/json",
    }
  });

  const text = result.text;
  return JSON.parse(cleanJson(text || "{}"));
};

export const askAiAboutQuestion = async (apiKey: string, question: QuizQuestion, userQuery: string, provider: AiProvider = 'google-ai'): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const genAI = getSDKInstance(apiKey);
  const model = getTextModel();
  const prompt = `Dúvida do jogador sobre a questão: ${question.question}. O usuário pergunta: "${userQuery}". Responda de forma rápida e instrutiva.`;

  const result = await genAI.models.generateContent({
    model,
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  return result.text || "Sem resposta.";
};

export const generateSpeech = async (apiKey: string, text: string, config: TTSConfig, provider: AiProvider = 'google-ai'): Promise<string | null> => {
  if (!apiKey) return null;
  const genAI = getSDKInstance(apiKey);
  const voiceName = config.gender === 'male' ? 'Fenrir' : 'Kore';
  try {
    const result = await genAI.models.generateContent({
      model: getTtsModel(),
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    });
    return (result as any).data || null;
  } catch (error) { return null; }
};

export const preGenerateQuizAudio = async (apiKey: string, quiz: GeneratedQuiz, ttsConfig: TTSConfig, teamNames: string[] = [], provider: AiProvider = 'google-ai'): Promise<GeneratedQuiz> => {
  if (!apiKey) return quiz;
  const updatedQuestions = [...quiz.questions];
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    let activeTeamName = teamNames.length > 0 ? teamNames[i % teamNames.length] : "";
    const textToRead = getQuestionReadAloudText(q, activeTeamName);
    try {
      const audioBase64 = await generateSpeech(apiKey, textToRead, ttsConfig, provider);
      if (audioBase64) updatedQuestions[i].audioBase64 = audioBase64;
    } catch (e) { }
  }
  return { ...quiz, questions: updatedQuestions };
}

