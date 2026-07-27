"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEvaluationPrompt = buildEvaluationPrompt;
function buildEvaluationPrompt(question, modelAnswer, userAnswer) {
    return `
    Avalie a resposta: 
    Pergunta: "${question}", 
    Gabarito: "${modelAnswer}", 
    Jogador disse: "${userAnswer}".
    
    A resposta deve ser um objeto JSON seguindo exatamente este formato:
    {
      "score": 0.8, // Pontuação de 0.0 a 1.0 (float)
      "feedback": "Sua resposta foi boa, mas...",
      "isCorrect": true // true se o score for >= 0.7 ou conforme o gabarito
    }
  `;
}
//# sourceMappingURL=buildEvaluationPrompt.js.map