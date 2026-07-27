import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { callWithFallback } from './model-rotation';
import { callOpenRouter } from './openrouter-client';
import { 
  buildEvaluationPrompt, 
  getSystemInstruction, 
  parseEvaluationResponse
} from './ai-prompts';

interface EvaluateRequestData {
  question: string;
  modelAnswer: string;
  userAnswer: string;
  systemPrompt?: string;
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const handler = async (request: { data: { question: string; modelAnswer: string; userAnswer: string; systemPrompt?: string } }): Promise<any> => {
  const { question, modelAnswer, userAnswer, systemPrompt } = request.data;
  
  if (!question || !modelAnswer || !userAnswer) {
    throw new HttpsError('invalid-argument', 'Parâmetros obrigatórios não fornecidos');
  }
  
  if (!OPENROUTER_API_KEY) {
    throw new HttpsError('internal', 'Configuração do servidor incompleta');
  }
  
  const prompt = buildEvaluationPrompt(question, modelAnswer, userAnswer);
  const systemInstruction = getSystemInstruction(false, systemPrompt);
  
  const requestBody = {
    messages: [
      { role: "system" as const, content: systemInstruction + "\nResponda APENAS em JSON." },
      { role: "user" as const, content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" as const }
  };
  
  try {
    const result = await callWithFallback(
      (model) => callOpenRouter(OPENROUTER_API_KEY!, { ...requestBody, model })
    );
    
    const parsed = parseEvaluationResponse(result.data.choices[0]?.message?.content || '');
    
    const response = {
      score: parsed.score,
      feedback: parsed.feedback,
      isCorrect: parsed.isCorrect,
      _meta: result.meta
    };
    
    return response;
    
  } catch (error: any) {
    console.error('[evaluateFreeResponse] Erro final:', error.message);
    
    if (error instanceof HttpsError) throw error;
    
    throw new HttpsError('unavailable', error.message);
  }
};

export const evaluateFreeResponse = onCall(handler as any);