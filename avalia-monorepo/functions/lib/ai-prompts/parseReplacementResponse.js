"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseReplacementResponse = parseReplacementResponse;
const parseQuizResponse_1 = require("./parseQuizResponse");
function parseReplacementResponse(text) {
    if (!text)
        throw new Error("Resposta vazia da IA");
    const raw = (0, parseQuizResponse_1.cleanJson)(text);
    const p = JSON.parse(raw);
    return {
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
}
//# sourceMappingURL=parseReplacementResponse.js.map