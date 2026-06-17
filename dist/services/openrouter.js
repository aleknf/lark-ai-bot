"use strict";
// ============================================
// OpenRouter API Client
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCompletion = chatCompletion;
exports.buildMessages = buildMessages;
const config_1 = require("../config");
const utils_1 = require("../utils");
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
/**
 * Call OpenRouter chat completions API (non-streaming).
 */
async function chatCompletion(messages, options) {
    const config = (0, config_1.getConfig)();
    const model = options?.model ?? config.OPENROUTER_MODEL;
    const body = {
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
        stream: false,
    };
    utils_1.logger.debug({ model, messageCount: messages.length }, "Calling OpenRouter");
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.OPENROUTER_API_KEY}`,
        "HTTP-Referer": config.OPENROUTER_APP_URL || "http://localhost:3000",
        "X-Title": config.OPENROUTER_APP_NAME || "LarkAIBot",
    };
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }
    const data = (await response.json());
    const choice = data.choices?.[0];
    if (!choice) {
        throw new Error("OpenRouter returned no choices");
    }
    utils_1.logger.debug({ tokens: data.usage?.total_tokens }, "OpenRouter response received");
    return {
        content: choice.message.content,
        usage: data.usage,
    };
}
/**
 * Build a conversation messages array for OpenRouter.
 */
function buildMessages(systemPrompt, history, userMessage) {
    const messages = [
        { role: "system", content: systemPrompt },
    ];
    // Add recent history (last N messages)
    // Avoid bloating context — trim to most recent
    const recentHistory = history.slice(-20);
    messages.push(...recentHistory);
    // Add current user message
    messages.push({ role: "user", content: userMessage });
    return messages;
}
//# sourceMappingURL=openrouter.js.map