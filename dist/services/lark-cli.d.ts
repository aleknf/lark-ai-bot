import type { CLIResult, PermissionDenied, AuthInitiateResult } from "../types";
export declare const LARK_DOMAINS: readonly ["im", "base", "sheets", "docs", "calendar", "contact", "drive", "task", "approval", "attendance", "okr", "mail", "markdown", "minutes", "vc", "whiteboard", "wiki", "event"];
export type LarkDomain = typeof LARK_DOMAINS[number];
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
 * Generic lark-cli command executor.
 * This allows the AI to execute any lark-cli command dynamically.
 *
 * @example
 * // Calendar
 * await execLarkCommand("calendar", ["+agenda", "--start", "2024-01-01T00:00:00+08:00", "--end", "2024-01-07T23:59:59+08:00"])
 *
 * // Tasks
 * await execLarkCommand("task", ["+get-my-tasks", "--as", "user"])
 *
 * // Contact search
 * await execLarkCommand("contact", ["+search-user", "--query", "John"])
 */
export declare function execLarkCommand(domain: string, args: string[], options?: {
    timeout?: number;
    as?: "bot" | "user";
}): Promise<unknown>;
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