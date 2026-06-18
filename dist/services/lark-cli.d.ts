import type { CLIResult, PermissionDenied, AuthInitiateResult } from "../types";
/**
 * Error thrown when a lark-cli command fails due to missing user permissions.
 * Catchers can use this to trigger the auth flow.
 */
export declare class PermissionDeniedError extends Error {
    readonly permission: PermissionDenied;
    constructor(permission: PermissionDenied);
}
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
 * Initiate user authorization for missing scopes.
 * Returns a verification URL and device code — caller should present the URL
 * to the user and then call completeAuth() after the user confirms.
 */
export declare function initiateAuth(scopes: string[]): Promise<AuthInitiateResult>;
/**
 * Complete authorization after user has authorized in browser.
 */
export declare function completeAuth(deviceCode: string): Promise<void>;
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