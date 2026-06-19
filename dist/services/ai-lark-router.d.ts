import type { OpenRouterMessage } from "../types";
/**
 * AI-powered router that determines which lark-cli commands to execute
 * based on natural language input.
 */
export declare function routeToLarkCLI(userPrompt: string, chatHistory?: OpenRouterMessage[]): Promise<{
    success: boolean;
    data?: unknown;
    response: string;
}>;
/**
 * Specialized handler for common user queries that can be optimized
 */
export declare function handleCommonQuery(query: string): Promise<string | null>;
//# sourceMappingURL=ai-lark-router.d.ts.map