import { GeneratedQuiz, QuizQuestion } from "./core-types";

export function cleanJson(text: string): string {
  if (!text) return "";
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
}

export function parseQuizResponse(text: string): GeneratedQuiz {
  if (!text) throw new Error("Resposta vazia da IA");
  
  const raw = cleanJson(text);
  const parsedPt = JSON.parse(raw);
  
  return {
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
}