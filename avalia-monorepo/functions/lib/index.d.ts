export declare const generateQuizProxy: import("firebase-functions/v2/https").HttpsFunction;
/**
 * Cloud Function Serverless Callable para consultar a lista oficial de modelos dos provedores usando as chaves de servidor.
 */
export declare const getAvailableModelsProxy: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    valid: boolean;
    tested: boolean;
    activeProvider: string;
    activeModel: string;
    models?: undefined;
    defaultModel?: undefined;
} | {
    valid: boolean;
    tested: boolean;
    activeProvider?: undefined;
    activeModel?: undefined;
    models?: undefined;
    defaultModel?: undefined;
} | {
    models: {
        value: string;
        label: string;
        status: string;
    }[];
    valid: boolean;
    tested?: undefined;
    activeProvider?: undefined;
    activeModel?: undefined;
    defaultModel?: undefined;
} | {
    models: any;
    defaultModel: any;
    valid: boolean;
    tested?: undefined;
    activeProvider?: undefined;
    activeModel?: undefined;
}>, unknown>;
//# sourceMappingURL=index.d.ts.map