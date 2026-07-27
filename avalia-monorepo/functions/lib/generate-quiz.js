"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuiz = void 0;
const https_1 = require("firebase-functions/v2/https");
const model_rotation_1 = require("./model-rotation");
const openrouter_client_1 = require("./openrouter-client");
const ai_prompts_1 = require("./ai-prompts");
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
    console.error('[generateQuiz] OPENROUTER_API_KEY não configurada');
}
const handler = async (request) => {
    const { config, globalExclusions, systemPrompt, librasEnabled } = request.data;
    if (!config) {
        throw new https_1.HttpsError('invalid-argument', 'Config não fornecida');
    }
    if (!OPENROUTER_API_KEY) {
        console.error('[generateQuiz] OPENROUTER_API_KEY não configurada');
        throw new https_1.HttpsError('internal', 'Configuração do servidor incompleta');
    }
    const prompt = (0, ai_prompts_1.buildQuizPrompt)(config, globalExclusions);
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
        const parsed = (0, ai_prompts_1.parseQuizResponse)(result.data.choices[0]?.message?.content || '');
        const response = {
            title: parsed.title,
            questions: parsed.questions,
            keywords: parsed.keywords,
            focalTheme: parsed.focalTheme,
            _meta: result.meta
        };
        return response;
    }
    catch (error) {
        console.error('[generateQuiz] Erro final:', error.message);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('unavailable', error.message);
    }
};
exports.generateQuiz = (0, https_1.onCall)(handler);
//# sourceMappingURL=generate-quiz.js.map