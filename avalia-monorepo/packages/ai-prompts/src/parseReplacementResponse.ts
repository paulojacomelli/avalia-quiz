import { QuizQuestion, shuffleQuestionOptions } from "@avalia/core";
import { cleanJson } from "./parseQuizResponse";

export function parseReplacementResponse(text: string): QuizQuestion {
  if (!text) throw new Error("Resposta vazia da IA");
  
  const raw = cleanJson(text);
  const p = JSON.parse(raw);
  
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
}