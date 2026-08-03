import { GeneratedQuiz, QuizQuestion, shuffleQuizOptions } from "@avalia/core";

export function cleanJson(text: string): string {
  if (!text) return "";
  return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
}

const GENERIC_TITLES = [
  "quiz", "conhecimentos gerais", "história", "historia", "acadêmico", "academico",
  "entretenimento", "arte & cultura", "geopolítica", "geopolitica", "mundo animal",
  "geral", "ciência", "matemática", "geografia", "literatura", "filosofia", "cinema",
  "música", "games", "séries", "cultura pop", "esportes"
];

function sanitizeTitle(rawTitle: string, keywords: string[]): string {
  const clean = (rawTitle || "").trim();
  const lower = clean.toLowerCase();
  const isGeneric = !clean || 
    lower.includes("conhecimentos gerais") ||
    lower === "quiz" ||
    GENERIC_TITLES.some(g => lower === g || lower === `quiz de ${g}` || lower === `quiz sobre ${g}`);

  if (isGeneric && keywords && keywords.length > 0 && keywords[0]?.trim()) {
    const focal = keywords[0].trim();
    const capitalizedFocal = focal.charAt(0).toUpperCase() + focal.slice(1);
    return `Quiz Especial: ${capitalizedFocal}`;
  }
  return clean || "Quiz Especial";
}

export function parseQuizResponse(text: string): GeneratedQuiz {
  if (!text) throw new Error("Resposta vazia da IA");
  
  const raw = cleanJson(text);
  const parsedPt = JSON.parse(raw);
  const keywords = parsedPt.palavrasChave || [];
  const rawTitle = parsedPt.titulo || "Quiz";
  const sanitizedTitle = sanitizeTitle(rawTitle, keywords);

  const rawQuiz: GeneratedQuiz = {
    title: sanitizedTitle,
    keywords,
    focalTheme: (keywords[0] && keywords[0].trim()) ? keywords[0].trim() : sanitizedTitle,
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

  return shuffleQuizOptions(rawQuiz);
}