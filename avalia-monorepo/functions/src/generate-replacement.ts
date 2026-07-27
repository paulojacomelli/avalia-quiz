import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { callWithFallback } from './model-rotation';
import { callOpenRouter } from './openrouter-client';
import { 
  buildReplacementPrompt, 
  getSystemInstruction, 
  parseReplacementResponse
} from './ai-prompts';

interface GenerateReplacementRequestData {
  config: any;
  avoidQuestionText: string;
  systemPrompt?: string;
  librasEnabled?: boolean;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const handler = async (request: { data: GenerateReplacementRequestData }): Promise<any> => {
  const { config, avoidQuestionText, systemPrompt, librasEnabled } = request.data;
  
  if (!config) {
    throw new HttpsError('invalid-argument', 'Config não fornecida');
  }
  
  if (!OPENROUTER_API_KEY) {
    throw new HttpsError('internal', 'Configuração do servidor incompleta');
  }
  
  const prompt = buildReplacementPrompt(config, avoidQuestionText);
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
    
    const parsed = parseReplacementResponse(result.data.choices[0]?.message?.content || '');
    
    const response = {
      id: parsed.id,
      question: parsed.question,
      options: parsed.options,
      correctAnswerIndex: parsed.correctAnswerIndex,
      correctAnswerText: parsed.correctAnswerText,
      reference: parsed.reference,
      explanation: parsed.explanation,
      glosa: parsed.glosa,
      hint: parsed.hint,
      _meta: result.meta
    };
    
    return response;
    
  } catch (error: any) {
    console.error('[generateReplacementQuestion] Erro final:', error.message);
    
    if (error instanceof HttpsError) throw error;
    
    throw new HttpsError('unavailable', error.message);
  }
};

export const generateReplacementQuestion = onCall(handler as any);