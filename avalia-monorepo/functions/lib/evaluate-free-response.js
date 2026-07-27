"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateFreeResponse = void 0;
const https_1 = require("firebase-functions/v2/https");
const model_rotation_1 = require("./model-rotation");
const openrouter_client_1 = require("./openrouter-client");
const ai_prompts_1 = require("./ai-prompts");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const handler = async (request) => {
    const { question, modelAnswer, userAnswer, systemPrompt } = request.data;
    if (!question || !modelAnswer || !userAnswer) {
        throw new https_1.HttpsError('invalid-argument', 'Parâmetros obrigatórios não fornecidos');
    }
    if (!OPENROUTER_API_KEY) {
        throw new https_1.HttpsError('internal', 'Configuração do servidor incompleta');
    }
    const prompt = (0, ai_prompts_1.buildEvaluationPrompt)(question, modelAnswer, userAnswer);
    const systemInstruction = (0, ai_prompts_1.getSystemInstruction)(false, systemPrompt);
    const requestBody = {
        messages: [
            { role: "system", content: systemInstruction + "\nResponda APENAS em JSON." },
            { role: "user", content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
    };
    try {
        const result = await (0, model_rotation_1.callWithFallback)((model) => (0, openrouter_client_1.callOpenRouter)(OPENROUTER_API_KEY, { ...requestBody, model }));
        const parsed = (0, ai_prompts_1.parseEvaluationResponse)(result.data.choices[0]?.message?.content || '');
        const response = {
            score: parsed.score,
            feedback: parsed.feedback,
            isCorrect: parsed.isCorrect,
            _meta: result.meta
        };
        return response;
    }
    catch (error) {
        console.error('[evaluateFreeResponse] Erro final:', error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('unavailable', error.message);
    }
};
exports.evaluateFreeResponse = (0, https_1.onCall)(handler);
//# sourceMappingURL=evaluate-free-response.js.map