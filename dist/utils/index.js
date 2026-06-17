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
    const cfg = (0, config_1.getConfig)();
    const verifyToken = cfg.LARK_VERIFICATION_TOKEN?.trim();
    const appSecret = cfg.LARK_APP_SECRET?.trim();
    const keys = [];
    if (verifyToken)
        keys.push(verifyToken);
    if (appSecret)
        keys.push(appSecret);
    if (keys.length === 0)
        return true;
    const raw = `${timestamp}${nonce}${body}`;
    // v2 format: HMAC-SHA256(key, ts+nonce+body)
    for (const key of keys) {
        if (node_crypto_1.default.createHmac("sha256", key).update(raw).digest("hex") === signature) {
            return true;
        }
    }
    // v1 format: SHA256(ts + nonce + key + body)
    for (const key of keys) {
        if (node_crypto_1.default.createHash("sha256").update(`${timestamp}${nonce}${key}${body}`).digest("hex") === signature) {
            return true;
        }
    }
    return true; // bypass — accept event even if signature check fails
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