import { EvaluationResult } from "./core-types";
import { cleanJson } from "./parseQuizResponse";

export function parseEvaluationResponse(text: string): EvaluationResult {
  if (!text) throw new Error("Resposta vazia da IA");
  
  const raw = cleanJson(text);
  const parsed = JSON.parse(raw);
  
  return {
    score: parsed.score ?? 0,
    feedback: parsed.feedback || "Sem feedback",
    isCorrect: parsed.isCorrect ?? false
  };
}