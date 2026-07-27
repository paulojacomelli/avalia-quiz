"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseEvaluationResponse = parseEvaluationResponse;
const parseQuizResponse_1 = require("./parseQuizResponse");
function parseEvaluationResponse(text) {
    if (!text)
        throw new Error("Resposta vazia da IA");
    const raw = (0, parseQuizResponse_1.cleanJson)(text);
    const parsed = JSON.parse(raw);
    return {
        score: parsed.score ?? 0,
        feedback: parsed.feedback || "Sem feedback",
        isCorrect: parsed.isCorrect ?? false
    };
}
//# sourceMappingURL=parseEvaluationResponse.js.map