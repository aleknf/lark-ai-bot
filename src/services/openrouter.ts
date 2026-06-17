// ============================================
// OpenRouter API Client
// ============================================

import { getConfig } from "../config";
import { logger } from "../utils";
import type { OpenRouterMessage, OpenRouterRequest, OpenRouterResponse } from "../types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";

/**
 * Call OpenRouter chat completions API (non-streaming).
 */
export async function chatCompletion(
  messages: OpenRouterMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }
): Promise<{ content: string; usage?: OpenRouterResponse["usage"] }> {
  const config = getConfig();
  const model = options?.model ?? config.OPENROUTER_MODEL;

  const body: OpenRouterRequest = {
    model,
    messages,
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 2000,
    stream: false,
  };

  logger.debug({ model, messageCount: messages.length }, "Calling OpenRouter");

  const headers: Record<string, string> = {
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

  const data = (await response.json()) as OpenRouterResponse;

  const choice = data.choices?.[0];
  if (!choice) {
    throw new Error("OpenRouter returned no choices");
  }

  logger.debug(
    { tokens: data.usage?.total_tokens },
    "OpenRouter response received"
  );

  return {
    content: choice.message.content,
    usage: data.usage,
  };
}

/**
 * Build a conversation messages array for OpenRouter.
 */
export function buildMessages(
  systemPrompt: string,
  history: OpenRouterMessage[],
  userMessage: string
): OpenRouterMessage[] {
  const messages: OpenRouterMessage[] = [
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
