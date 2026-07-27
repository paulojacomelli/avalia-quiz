"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReplacementQuestion = void 0;
const https_1 = require("firebase-functions/v2/https");
const model_rotation_1 = require("./model-rotation");
const openrouter_client_1 = require("./openrouter-client");
const ai_prompts_1 = require("./ai-prompts");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const handler = async (request) => {
    const { config, avoidQuestionText, systemPrompt, librasEnabled } = request.data;
    if (!config) {
        throw new https_1.HttpsError('invalid-argument', 'Config não fornecida');
    }
    if (!OPENROUTER_API_KEY) {
        throw new https_1.HttpsError('internal', 'Configuração do servidor incompleta');
    }
    const prompt = (0, ai_prompts_1.buildReplacementPrompt)(config, avoidQuestionText);
    const systemInstruction = (0, ai_prompts_1.getSystemInstruction)(librasEnabled, systemPrompt);
    const requestBody = {
        messages: [
            { role: "system", content: systemInstruction + "\nResponda APENAS em JSON." },
            { role: "user", content: prompt }
        ],
        temperature: config.temperature,
        response_format: { type: "json_object" }
    };
    try {
        const result = await (0, model_rotation_1.callWithFallback)((model) => (0, openrouter_client_1.callOpenRouter)(OPENROUTER_API_KEY, { ...requestBody, model }));
        const parsed = (0, ai_prompts_1.parseReplacementResponse)(result.data.choices[0]?.message?.content || '');
        const response = {
            id: parsed.id,
            question: parsed.question,
            options: parsed.options,
            correctAnswerIndex: parsed.correctAnswerIndex,
            correctAnswerText: parsed.correctAnswerText,
            reference: parsed.reference,
            explanation: parsed.explanation,
            glosa: parsed.glosa,
            hint: parsed.hint,
            _meta: result.meta
        };
        return response;
    }
    catch (error) {
        console.error('[generateReplacementQuestion] Erro final:', error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('unavailable', error.message);
    }
};
exports.generateReplacementQuestion = (0, https_1.onCall)(handler);
//# sourceMappingURL=generate-replacement.js.map