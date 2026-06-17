import type { CLIResult } from "../types";
/**
 * Execute a lark-cli command and return raw result.
 */
export declare function execLarkCLI(args: string[], options?: {
    timeout?: number;
}): Promise<CLIResult>;
/**
 * Execute a lark-cli command and parse stdout as JSON.
 */
export declare function execLarkCLIJSON<T>(args: string[], options?: {
    timeout?: number;
}): Promise<T>;
/**
 * Send a text message to a chat.
 */
export declare function sendMessage(chatId: string, text: string, options?: {
    replyToMessageId?: string;
    as?: "bot" | "user";
}): Promise<void>;
/**
 * Fetch recent chat messages for context.
 */
export declare function fetchChatHistory(chatId: string, limit?: number): Promise<{
    messageId: string;
    senderId: string;
    text: string;
    timestamp: number;
}[]>;
//# sourceMappingURL=lark-cli.d.ts.map