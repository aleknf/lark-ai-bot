import type { OpenRouterMessage, OpenRouterResponse } from "../types";
/**
 * Call OpenRouter chat completions API (non-streaming).
 */
export declare function chatCompletion(messages: OpenRouterMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
}): Promise<{
    content: string;
    usage?: OpenRouterResponse["usage"];
}>;
/**
 * Build a conversation messages array for OpenRouter.
 */
export declare function buildMessages(systemPrompt: string, history: OpenRouterMessage[], userMessage: string): OpenRouterMessage[];
//# sourceMappingURL=openrouter.d.ts.map