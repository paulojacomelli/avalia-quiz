"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callWithFallback = callWithFallback;
const model_groups_1 = require("./ai-prompts/model-groups");
const ROTATION_SEQUENCE = [
    { group: 'high', attempt: 1, maxAttempts: 2 },
    { group: 'high', attempt: 2, maxAttempts: 2 },
    { group: 'mid', attempt: 1, maxAttempts: 2 },
    { group: 'mid', attempt: 2, maxAttempts: 2 },
    { group: 'low', attempt: 1, maxAttempts: 2 },
    { group: 'low', attempt: 2, maxAttempts: 2 },
];
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
function shouldFallback(error) {
    if (error?.status === 401)
        return false;
    if (error?.status === 400 && error?.message?.includes('schema'))
        return false;
    const fallbackStatuses = [429, 500, 502, 503, 504];
    if (fallbackStatuses.includes(error?.status))
        return true;
    if (error?.code === 'ECONNRESET' || error?.code === 'ETIMEDOUT' || error?.code === 'ENOTFOUND')
        return true;
    if (error?.message?.includes('timeout') || error?.message?.includes('network'))
        return true;
    return true;
}
async function callWithFallback(requestFn) {
    const triedModels = new Set();
    let lastError;
    for (const step of ROTATION_SEQUENCE) {
        const groupModels = model_groups_1.MODEL_GROUPS[step.group];
        const availableModels = groupModels.filter((m) => !triedModels.has(m));
        if (availableModels.length === 0) {
            console.warn(`[Rotation] Todos modelos do grupo ${step.group} já tentados, pulando...`);
            continue;
        }
        const shuffled = shuffleArray(availableModels);
        const model = shuffled[0];
        triedModels.add(model);
        console.log(`[Rotation] Tentativa ${step.attempt}/${step.maxAttempts} - Grupo: ${step.group.toUpperCase()} - Modelo: ${model}`);
        try {
            const result = await requestFn(model);
            console.log(`[Rotation] ✅ Sucesso com ${model} (${step.group})`);
            return { data: result, meta: { model, group: step.group } };
        }
        catch (error) {
            console.error(`[Rotation] ❌ Falhou ${model} (${step.group}):`, error?.status || error?.message);
            lastError = error;
            if (!shouldFallback(error)) {
                console.log(`[Rotation] Erro não recuperável, abortando rotação`);
                throw error;
            }
        }
    }
    throw new Error("Todos os modelos falharam. Tente novamente em alguns minutos ou configure um provedor de IA nas configurações.");
}
//# sourceMappingURL=model-rotation.js.map