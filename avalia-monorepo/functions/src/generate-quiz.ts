import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { callWithFallback } from './model-rotation';
import { callOpenRouter } from './openrouter-client';
import { 
  buildQuizPrompt, 
  getSystemInstruction, 
  parseQuizResponse
} from './ai-prompts';

interface GenerateQuizRequestData {
  config: any;
  globalExclusions: string[];
  systemPrompt?: string;
  librasEnabled?: boolean;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.error('[generateQuiz] OPENROUTER_API_KEY não configurada');
}

const handler = async (request: { data: GenerateQuizRequestData }): Promise<any> => {
  const { config, globalExclusions, systemPrompt, librasEnabled } = request.data;
  
  if (!config) {
    throw new HttpsError('invalid-argument', 'Config não fornecida');
  }
  
  if (!OPENROUTER_API_KEY) {
    console.error('[generateQuiz] OPENROUTER_API_KEY não configurada');
    throw new HttpsError('internal', 'Configuração do servidor incompleta');
  }
  
  const prompt = buildQuizPrompt(config, globalExclusions);
  const systemInstruction = getSystemInstruction(librasEnabled, systemPrompt);
  
  const requestBody = {
    messages: [
      { role: "system" as const, content: systemInstruction + "\nResponda APENAS em JSON." },
      { role: "user" as const, content: prompt }
    ],
    temperature: config.temperature,
    response_format: { type: "json_object" as const }
  };
  
  try {
    const result = await callWithFallback(
      (model) => callOpenRouter(OPENROUTER_API_KEY!, { ...requestBody, model })
    );
    
    const parsed = parseQuizResponse(result.data.choices[0]?.message?.content || '');
    
    const response = {
      title: parsed.title,
      questions: parsed.questions,
      keywords: parsed.keywords,
      focalTheme: parsed.focalTheme,
      _meta: result.meta
    };
    
    return response;
    
  } catch (error: any) {
    console.error('[generateQuiz] Erro final:', error.message);
    
    if (error instanceof HttpsError) throw error;
    
    throw new HttpsError('unavailable', error.message);
  }
};

export const generateQuiz = onCall(handler as any);