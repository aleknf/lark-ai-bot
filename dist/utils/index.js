"use strict";
// ============================================
// Utilities — logger, signature verification, helpers
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.verifyLarkSignature = verifyLarkSignature;
exports.extractTextFromContent = extractTextFromContent;
exports.safeJsonParse = safeJsonParse;
exports.sleep = sleep;
exports.truncate = truncate;
const node_crypto_1 = __importDefault(require("node:crypto"));
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
// --- Logger ---
exports.logger = (0, pino_1.default)({
    level: (0, config_1.getConfig)().NODE_ENV === "production" ? "info" : "debug",
    transport: (0, config_1.getConfig)().NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
});
// --- Lark Webhook Signature Verification ---
/**
 * Verify the Lark webhook signature.
 * Uses HMAC-SHA256 with the verification token as the key.
 */
function verifyLarkSignature(timestamp, nonce, body, signature) {
    const token = (0, config_1.getConfig)().LARK_VERIFICATION_TOKEN;
    if (!token) {
        exports.logger.warn("LARK_VERIFICATION_TOKEN not set — skipping signature verification");
        return true;
    }
    const trimmedToken = token.trim();
    // Try all permutations of timestamp, nonce, body
    const perms = [
        ["ts+nonce+body", `${timestamp}${nonce}${body}`],
        ["ts+body+nonce", `${timestamp}${body}${nonce}`],
        ["nonce+ts+body", `${nonce}${timestamp}${body}`],
        ["nonce+body+ts", `${nonce}${body}${timestamp}`],
        ["body+ts+nonce", `${body}${timestamp}${nonce}`],
        ["body+nonce+ts", `${body}${nonce}${timestamp}`],
    ];
    const results = {};
    for (const [label, raw] of perms) {
        results[label] = node_crypto_1.default.createHmac("sha256", trimmedToken).update(raw).digest("hex");
    }
    // Check all permutations
    for (const [label, expected] of Object.entries(results)) {
        if (expected === signature) {
            exports.logger.info({ permutation: label }, "Signature matched!");
            return true;
        }
    }
    exports.logger.warn({
        received: signature,
        tokenPrefix: trimmedToken.slice(0, 6) + "…",
        timestamp,
        nonce,
        bodyLength: body.length,
        bodyPreview: body.slice(0, 100),
        permutations: results,
    }, "Webhook signature mismatch — all permutations failed");
    return false;
}
// --- Text Extraction from Lark Message Content ---
/**
 * Parse the JSON content string from a Lark message into plain text.
 */
function extractTextFromContent(content) {
    try {
        const parsed = JSON.parse(content);
        // text message
        if (parsed.text)
            return parsed.text;
        // post message — extract text from elements
        if (parsed.content) {
            const texts = [];
            for (const block of parsed.content) {
                if (Array.isArray(block)) {
                    for (const element of block) {
                        if (element.tag === "text" && element.text) {
                            texts.push(element.text);
                        }
                        else if (element.tag === "at" && element.user_name) {
                            texts.push(`@${element.user_name}`);
                        }
                    }
                }
            }
            return texts.join("");
        }
        return "";
    }
    catch {
        return content;
    }
}
// --- Safe JSON Parse ---
function safeJsonParse(str, fallback) {
    try {
        return JSON.parse(str);
    }
    catch {
        return fallback;
    }
}
// --- Sleep Utility ---
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// --- Truncate String ---
function truncate(str, maxLen) {
    if (str.length <= maxLen)
        return str;
    return str.slice(0, maxLen - 3) + "...";
}
//# sourceMappingURL=index.js.map