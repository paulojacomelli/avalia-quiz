// packages/infrastructure/llm-client/src/interfaces.ts

export interface LLMRequestPayload {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  options?: {
    modelId?: string; // ex: 'gemini-1.5-pro'
    temperature?: number;
  };
}

export interface LLMResponsePayload {
  content: string;         // A string crua gerada pela IA
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

/**
 * Interface estrita do Cliente LLM.
 * Não possui conhecimento de domínio (Quiz, JW, Regras).
 * Recebe instruções puras e retorna texto puro.
 */
export interface ILlmClient {
  generateText(payload: LLMRequestPayload): Promise<LLMResponsePayload>;
  generateStream?(payload: LLMRequestPayload): AsyncIterable<string>; // (Opcional p/ futuro)
}
