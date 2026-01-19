
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { QuizConfig, TopicMode, GeneratedQuiz, QuizQuestion, HintType, QuizFormat, EvaluationResult, TTSConfig } from "../types";
import { getQuestionReadAloudText } from "../utils/tts";

// --- ENTROPIA E VARIABILIDADE ---
// Now handled dynamically via keyword exclusion in the prompt

const cleanJson = (text: string): string => {
  if (!text) return "";
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
};

const getSystemInstruction = () => `
Você é um Mestre de Quiz profissional, carismático e especializado em conhecimentos gerais. 
Sua base de conhecimento abrange ciência, história, artes, entretenimento, geografia, esportes e tecnologia.

DIRETRIZES DE LINGUAGEM E DIFICULDADE:
1. Linguagem Simples: Use frases curtas, diretas e vocabulário acessível. As perguntas devem ser fáceis de ler e entender rapidamente, independente da dificuldade.
2. Dificuldade por Profundidade: A dificuldade (Fácil, Médio, Difícil) deve ser medida pela profundidade ou frequência do tema:
   - Fácil: Temas populares, cultura pop mainstream, fatos geográficos básicos.
   - Médio: Detalhes históricos menos conhecidos, descobertas científicas específicas, recordes esportivos.
   - Difícil: Temas de nicho, detalhes técnicos profundos, eventos históricos raros ou ciência avançada.

DIRETRIZES:
1. Neutralidade: Seja totalmente neutro e imparcial. Sem opiniões políticas ou religiosas.
2. Verificabilidade: Baseie as perguntas em fatos históricos e científicos amplamente aceitos.
3. Precisão: Garanta que todas as respostas estejam corretas.
4. Formato: Gere estritamente JSON.
5. Proibido: Não use fontes religiosas, doutrinas específicas ou sites confessionais (como jw.org). Use cultura secular geral.
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

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: "Respond OK." });
    return !!(response && response.text);
  } catch (error) { return false; }
};

export const generateQuizContent = async (apiKey: string, config: QuizConfig, globalExclusions: string[] = []): Promise<GeneratedQuiz> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);

  const allExclusions = Array.from(new Set([...(config.usedTopics || []), ...globalExclusions]));

  const exclusionList = allExclusions.length > 0
    ? `PROIBIDO: Não aborde temas diretamente relacionados a estas palavras-chave: ${allExclusions.join(', ')}.`
    : '';

  const prompt = `
    Crie um quiz emocionante com ${config.count} perguntas originais.
    TEMA: ${topicPrompt}.
    Dificuldade Solicitada: ${config.difficulty} (Texto de leitura simples, dificuldade por profundidade de tema).
    ${formatInstruction}
    ${exclusionList}
    VARIAÇÃO: Escolha um subtema criativo e inovador dentro da área especificada.
    PALAVRAS-CHAVE: Ao final, extraia APENAS UM termo (keyword) principal que defina o foco deste quiz para controle de entropia futura.
    REGRAS: Busque fatos curiosos e condizentes com a dificuldade solicitada. O título deve ser cativante.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: config.temperature,
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctAnswerIndex: { type: Type.INTEGER },
                correctAnswerText: { type: Type.STRING },
                reference: { type: Type.STRING },
                explanation: { type: Type.STRING },
                hint: { type: Type.STRING }
              },
              required: ["id", "question", "options", "correctAnswerIndex", "reference", "explanation", "hint"]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar conteúdo.");
  try {
    const parsed = JSON.parse(cleanJson(text)) as GeneratedQuiz;
    parsed.focalTheme = parsed.keywords?.[0] || "Dinâmico";
    return parsed;
  } catch (e) { throw new Error("Erro ao processar resposta da IA."); }
};

export const generateReplacementQuestion = async (apiKey: string, config: QuizConfig, avoidQuestionText: string): Promise<QuizQuestion> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  const prompt = `Gere uma nova pergunta para o tema: ${topicPrompt}. Dificuldade: ${config.difficulty}. NÃO repita esta ideia: "${avoidQuestionText}". ${formatInstruction}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      temperature: config.temperature,
      systemInstruction: getSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          question: { type: Type.STRING },
          options: { type: Type.ARRAY, items: { type: Type.STRING } },
          correctAnswerIndex: { type: Type.INTEGER },
          correctAnswerText: { type: Type.STRING },
          reference: { type: Type.STRING },
          explanation: { type: Type.STRING },
          hint: { type: Type.STRING }
        },
        required: ["id", "question", "options", "correctAnswerIndex", "reference", "explanation", "hint"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Falha ao gerar pergunta.");
  try {
    const question = JSON.parse(cleanJson(text)) as QuizQuestion;
    question.id = `sub-${Date.now()}`;
    return question;
  } catch (e) { throw new Error("Erro ao substituir pergunta."); }
};

export const evaluateFreeResponse = async (apiKey: string, question: string, modelAnswer: string, userAnswer: string): Promise<EvaluationResult> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Avalie a resposta: Pergunta: "${question}", Gabarito: "${modelAnswer}", Jogador disse: "${userAnswer}". JSON: {score, feedback, isCorrect}`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          isCorrect: { type: Type.BOOLEAN }
        },
        required: ["score", "feedback", "isCorrect"]
      }
    }
  });
  return JSON.parse(cleanJson(response.text));
};

export const askAiAboutQuestion = async (apiKey: string, question: QuizQuestion, userQuery: string): Promise<string> => {
  if (!apiKey) throw new Error("Chave de API não fornecida.");
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Dúvida do jogador sobre a questão: ${question.question}. O usuário pergunta: "${userQuery}". Responda de forma rápida e instrutiva.`;
  const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
  return response.text || "Sem resposta.";
};

export const generateSpeech = async (apiKey: string, text: string, config: TTSConfig): Promise<string | null> => {
  if (!apiKey) return null;
  const ai = new GoogleGenAI({ apiKey });
  const voiceName = config.gender === 'male' ? 'Fenrir' : 'Kore';
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) { return null; }
};

export const preGenerateQuizAudio = async (apiKey: string, quiz: GeneratedQuiz, ttsConfig: TTSConfig, teamNames: string[] = []): Promise<GeneratedQuiz> => {
  if (!apiKey) return quiz;
  const updatedQuestions = [...quiz.questions];
  for (let i = 0; i < updatedQuestions.length; i++) {
    const q = updatedQuestions[i];
    let activeTeamName = teamNames.length > 0 ? teamNames[i % teamNames.length] : "";
    const textToRead = getQuestionReadAloudText(q, activeTeamName);
    try {
      const audioBase64 = await generateSpeech(apiKey, textToRead, ttsConfig);
      if (audioBase64) updatedQuestions[i].audioBase64 = audioBase64;
    } catch (e) { }
  }
  return { ...quiz, questions: updatedQuestions };
}
