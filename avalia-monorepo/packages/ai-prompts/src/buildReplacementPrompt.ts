import { QuizConfig } from "@avalia/core";
import { getTopicPrompt, getFormatInstruction } from "./buildQuizPrompt";

export function buildReplacementPrompt(config: QuizConfig, avoidQuestionText: string): string {
  const topicPrompt = getTopicPrompt(config);
  const formatInstruction = getFormatInstruction(config);
  
  return `
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
}