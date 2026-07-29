"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanJson = cleanJson;
exports.parseQuizResponse = parseQuizResponse;
function cleanJson(text) {
    if (!text)
        return "";
    return text.replace(/```json\n?|\n?```/g, '').replace(/```\n?|\n?```/g, '').trim();
}
function parseQuizResponse(text) {
    if (!text)
        throw new Error("Resposta vazia da IA");
    const raw = cleanJson(text);
    const parsedPt = JSON.parse(raw);
    return {
        title: parsedPt.titulo || "Quiz",
        keywords: parsedPt.palavrasChave || [],
        focalTheme: parsedPt.palavrasChave?.[0] || "Dinâmico",
        questions: (parsedPt.perguntas || []).map((p) => ({
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
//# sourceMappingURL=parseQuizResponse.js.map