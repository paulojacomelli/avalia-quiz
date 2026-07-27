export declare function callWithFallback<T>(requestFn: (model: string) => Promise<T>): Promise<{
    data: T;
    meta: {
        model: string;
        group: string;
    };
}>;
//# sourceMappingURL=model-rotation.d.ts.map