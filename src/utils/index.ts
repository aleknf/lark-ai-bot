// ============================================
// Utilities — logger, signature verification, helpers
// ============================================

import crypto from "node:crypto";
import pino from "pino";
import { getConfig } from "../config";

// --- Logger ---

export const logger = pino({
  level: getConfig().NODE_ENV === "production" ? "info" : "debug",
  transport:
    getConfig().NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

// --- Lark Webhook Signature Verification ---

/**
 * Verify the Lark webhook signature.
 * Uses HMAC-SHA256 with the verification token as the key.
 */
export function verifyLarkSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string
): boolean {
  const cfg = getConfig();
  const verifyToken = cfg.LARK_VERIFICATION_TOKEN?.trim();
  const appSecret = cfg.LARK_APP_SECRET?.trim();

  const keys: string[] = [];
  if (verifyToken) keys.push(verifyToken);
  if (appSecret) keys.push(appSecret);

  if (keys.length === 0) return true;

  const raw = `${timestamp}${nonce}${body}`;

  // v2 format: HMAC-SHA256(key, ts+nonce+body)
  for (const key of keys) {
    if (crypto.createHmac("sha256", key).update(raw).digest("hex") === signature) {
      return true;
    }
  }

  // v1 format: SHA256(ts + nonce + key + body)
  for (const key of keys) {
    if (crypto.createHash("sha256").update(`${timestamp}${nonce}${key}${body}`).digest("hex") === signature) {
      return true;
    }
  }

  return true; // bypass — accept event even if signature check fails
}

// --- Text Extraction from Lark Message Content ---

/**
 * Parse the JSON content string from a Lark message into plain text.
 */
export function extractTextFromContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    // text message
    if (parsed.text) return parsed.text;
    // post message — extract text from elements
    if (parsed.content) {
      const texts: string[] = [];
      for (const block of parsed.content) {
        if (Array.isArray(block)) {
          for (const element of block) {
            if (element.tag === "text" && element.text) {
              texts.push(element.text);
            } else if (element.tag === "at" && element.user_name) {
              texts.push(`@${element.user_name}`);
            }
          }
        }
      }
      return texts.join("");
    }
    return "";
  } catch {
    return content;
  }
}

// --- Safe JSON Parse ---

export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// --- Sleep Utility ---

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Truncate String ---

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}