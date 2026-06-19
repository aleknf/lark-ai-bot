"use strict";
// ============================================
// IM Service — message send/reply/chat-history via lark-cli
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.imService = void 0;
const lark_cli_1 = require("./lark-cli");
const utils_1 = require("../utils");
const BOT_APP_ID = process.env.LARK_APP_ID || "";
/**
 * Lark IM operations via lark-cli.
 */
exports.imService = {
    async sendText(chatId, text, options) {
        utils_1.logger.debug({ chatId, textLength: text.length }, "Sending text message");
        await (0, lark_cli_1.sendMessage)(chatId, text, {
            replyToMessageId: options?.replyToMessageId,
            as: "bot",
        });
    },
    async reply(messageId, text) {
        utils_1.logger.debug({ messageId, textLength: text.length }, "Replying to message");
        await (0, lark_cli_1.execLarkCLIJSON)([
            "im", "+messages-reply",
            "--message-id", messageId,
            "--text", text,
            "--as", "bot",
        ]);
    },
    async getChatHistory(chatId, limit = 20) {
        try {
            const raw = await (0, lark_cli_1.fetchChatHistory)(chatId, limit);
            return raw.map((m) => ({
                messageId: m.messageId,
                senderId: m.senderId,
                text: m.text,
                timestamp: m.timestamp,
                isBot: m.senderId.includes(BOT_APP_ID) || m.senderId.startsWith("cli_"),
            }));
        }
        catch (error) {
            // If authorization fails, return empty history instead of crashing
            utils_1.logger.warn({ err: error, chatId }, "Could not fetch chat history (authorization issue?)");
            return [];
        }
    },
    async sendCard(chatId, cardJson) {
        const card = {
            config: { wide_screen_mode: true },
            ...cardJson,
        };
        utils_1.logger.debug({ chatId }, "Sending card message");
        // Use +messages-send with card JSON via --json flag
        await (0, lark_cli_1.execLarkCLIJSON)([
            "im", "+messages-send",
            "--chat-id", chatId,
            "--as", "bot",
            "--json", JSON.stringify({ card }),
        ]);
    },
};
//# sourceMappingURL=im.js.map