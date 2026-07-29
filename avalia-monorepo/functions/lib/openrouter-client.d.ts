interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
interface OpenRouterRequest {
    model: string;
    messages: OpenRouterMessage[];
    temperature: number;
    response_format?: {
        type: 'json_object';
    };
    max_tokens?: number;
}
interface OpenRouterResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}
export declare function callOpenRouter(apiKey: string, request: OpenRouterRequest): Promise<OpenRouterResponse>;
export {};
//# sourceMappingURL=openrouter-client.d.ts.map