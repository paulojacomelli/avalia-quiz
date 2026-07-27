"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOpenRouter = callOpenRouter;
async function callOpenRouter(apiKey, request) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://avalia-quiz.web.app',
            'X-Title': 'Avalia Quiz',
        },
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`OpenRouter ${response.status}: ${errorText}`);
        error.status = response.status;
        throw error;
    }
    return response.json();
}
//# sourceMappingURL=openrouter-client.js.map