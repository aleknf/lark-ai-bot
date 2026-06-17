// ============================================
// Bot Command Parser — parses user messages into structured commands
// ============================================

import type { BotCommand, ParsedMessage } from "../types";

const COMMANDS = {
  help: /^\/help$/i,
  search: /^\/search\s+(.+)/i,
  report: /^\/report(?:\s+(.+))?$/i,
  sheet: /^\/sheet\s+(.+)/i,
  ai: /^\/ai\s+(.+)/i,
} as const;

/**
 * Parse a user message into a BotCommand.
 * Recognizes slash commands and falls back to AI mode or unknown.
 */
export function parseCommand(
  message: ParsedMessage
): BotCommand {
  const text = message.text.trim();

  if (!text) {
    return { type: "help" };
  }

  for (const [command, pattern] of Object.entries(COMMANDS)) {
    const match = text.match(pattern);
    if (match) {
      switch (command) {
        case "help":
          return { type: "help" };
        case "search":
          return { type: "search", query: match[1].trim() };
        case "report":
          return { type: "report", topic: match[1]?.trim() };
        case "sheet":
          return { type: "sheet", query: match[1].trim() };
        case "ai":
          return { type: "ai", prompt: match[1].trim() };
      }
    }
  }

  // If bot is mentioned or in direct chat, treat as AI query
  if (message.isMentioned || message.chatType === "p2p") {
    return { type: "ai", prompt: text };
  }

  return { type: "unknown", raw: text };
}

/**
 * Generate help text for the bot.
 */
export function getHelpText(): string {
  return [
    "🤖 **Lark AI Bot — Available Commands**",
    "",
    "• `/help` — Show this help message",
    "• `/search <query>` — Search records in Lark Base",
    "• `/sheet <query>` — Query data from Lark Sheets",
    "• `/report [topic]` — Generate a report in Lark Docs",
    "• `/ai <prompt>` — Ask anything to the AI assistant",
    "",
    "You can also just mention me with any question!",
  ].join("\n");
}
