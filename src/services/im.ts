// ============================================
// IM Service — message send/reply/chat-history via lark-cli
// ============================================

import { execLarkCLI, execLarkCLIJSON, sendMessage, fetchChatHistory } from "./lark-cli";
import { logger } from "../utils";

export interface IMService {
  sendText(chatId: string, text: string, options?: { replyToMessageId?: string }): Promise<void>;
  reply(messageId: string, text: string): Promise<void>;
  getChatHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
  sendCard(chatId: string, cardJson: Record<string, unknown>): Promise<void>;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  text: string;
  timestamp: number;
  isBot: boolean;
}

const BOT_APP_ID = process.env.LARK_APP_ID || "";

/**
 * Lark IM operations via lark-cli.
 */
export const imService: IMService = {
  async sendText(chatId, text, options) {
    logger.debug({ chatId, textLength: text.length }, "Sending text message");
    await sendMessage(chatId, text, {
      replyToMessageId: options?.replyToMessageId,
      as: "bot",
    });
  },

  async reply(messageId, text) {
    logger.debug({ messageId, textLength: text.length }, "Replying to message");
    await execLarkCLIJSON([
      "im", "+messages-reply",
      "--message-id", messageId,
      "--text", text,
      "--as", "bot",
    ]);
  },

  async getChatHistory(chatId, limit = 20) {
    try {
      const raw = await fetchChatHistory(chatId, limit);
      return raw.map((m) => ({
        messageId: m.messageId,
        senderId: m.senderId,
        text: m.text,
        timestamp: m.timestamp,
        isBot: m.senderId.includes(BOT_APP_ID) || m.senderId.startsWith("cli_"),
      }));
    } catch (error) {
      // If authorization fails, return empty history instead of crashing
      logger.warn({ err: error, chatId }, "Could not fetch chat history (authorization issue?)");
      return [];
    }
  },

  async sendCard(chatId, cardJson) {
    const card = {
      config: { wide_screen_mode: true },
      ...cardJson,
    };
    logger.debug({ chatId }, "Sending card message");

    // Use +messages-send with card JSON via --json flag
    await execLarkCLIJSON([
      "im", "+messages-send",
      "--chat-id", chatId,
      "--as", "bot",
      "--json", JSON.stringify({ card }),
    ]);
  },
};
