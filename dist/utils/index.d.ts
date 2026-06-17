import pino from "pino";
export declare const logger: pino.Logger<never, boolean>;
/**
 * Verify the Lark webhook signature.
 * Uses HMAC-SHA256 with the verification token as the key.
 */
export declare function verifyLarkSignature(timestamp: string, nonce: string, body: string, signature: string): boolean;
/**
 * Parse the JSON content string from a Lark message into plain text.
 */
export declare function extractTextFromContent(content: string): string;
export declare function safeJsonParse<T>(str: string, fallback: T): T;
export declare function sleep(ms: number): Promise<void>;
export declare function truncate(str: string, maxLen: number): string;
//# sourceMappingURL=index.d.ts.map