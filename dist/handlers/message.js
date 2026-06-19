"use strict";
// ============================================
// Message Handler — processes incoming Lark IM message events
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMessageEvent = handleMessageEvent;
const utils_1 = require("../utils");
const im_1 = require("../services/im");
const commands_1 = require("./commands");
const pipeline_1 = require("./pipeline");
/**
 * Handle a Lark message receive event.
 * This is the main entry point for incoming messages.
 */
async function handleMessageEvent(body) {
    const event = body.event;
    if (!event?.message) {
        utils_1.logger.warn("No message in event");
        return;
    }
    const message = event.message;
    // Skip messages from the bot itself
    if (isBotMessage(event)) {
        utils_1.logger.debug("Skipping bot's own message");
        return;
    }
    // Parse the message
    const parsed = {
        messageId: message.message_id,
        chatId: message.chat_id,
        chatType: message.chat_type,
        senderOpenId: event.sender?.sender_id?.open_id || "",
        text: (0, utils_1.extractTextFromContent)(message.content),
        isMentioned: isBotMentioned(event),
        rootId: message.root_id,
        parentId: message.parent_id,
        timestamp: Date.now(),
    };
    utils_1.logger.info({
        messageId: parsed.messageId,
        chatId: parsed.chatId,
        chatType: parsed.chatType,
        isMentioned: parsed.isMentioned,
        text: parsed.text.slice(0, 100),
    }, "Received message");
    if (!parsed.text.trim()) {
        utils_1.logger.debug("Empty message text, skipping");
        return;
    }
    try {
        // Parse bot command
        const command = (0, commands_1.parseCommand)(parsed);
        utils_1.logger.info({ commandType: command.type }, "Parsed command");
        if (command.type === "unknown") {
            // Bot was not mentioned — ignore
            utils_1.logger.debug("Unknown command, not mentioned — ignoring");
            return;
        }
        // Execute the AI pipeline
        utils_1.logger.info({ commandType: command.type }, "Executing AI pipeline");
        const reply = await (0, pipeline_1.executePipeline)(parsed, command);
        if (reply) {
            utils_1.logger.info({ replyLength: reply.length }, "Sending reply");
            // Reply in thread if applicable, otherwise to chat
            await im_1.imService.sendText(parsed.chatId, reply, {
                replyToMessageId: message.root_id || message.message_id,
            });
            utils_1.logger.info("Reply sent successfully");
        }
        else {
            utils_1.logger.warn("Pipeline returned empty reply");
        }
    }
    catch (error) {
        utils_1.logger.error({ err: error }, "Failed to handle message");
        try {
            await im_1.imService.sendText(parsed.chatId, `❌ Sorry, an error occurred while processing your request: ${error instanceof Error ? error.message : "Unknown error"}`, { replyToMessageId: message.message_id });
        }
        catch (replyError) {
            utils_1.logger.error({ err: replyError }, "Failed to send error reply");
        }
    }
}
/**
 * Check if the message sender is the bot itself.
 */
function isBotMessage(event) {
    const senderId = event.sender?.sender_id?.open_id || "";
    // Bot sender IDs typically start with "on_" (not "ou_" which is for users)
    if (senderId.startsWith("on_")) {
        utils_1.logger.debug({ senderId }, "Detected bot's own message");
        return true;
    }
    // Empty sender ID is also suspicious
    if (!senderId) {
        utils_1.logger.debug("Message has no sender ID, treating as bot message");
        return true;
    }
    return false;
}
/**
 * Check if the bot is mentioned in the message.
 */
function isBotMentioned(event) {
    const mentions = event.message?.mentions;
    if (!mentions || mentions.length === 0) {
        utils_1.logger.debug("No mentions in message");
        return false;
    }
    utils_1.logger.debug({
        mentionCount: mentions.length,
        mentions: mentions.map(m => ({
            name: m.name,
            openId: m.id?.open_id,
            key: m.key
        }))
    }, "Checking mentions");
    for (const mention of mentions) {
        const mentionOpenId = mention.id?.open_id;
        // Bot open IDs typically start with "on_" (app/bot prefix)
        if (mentionOpenId && mentionOpenId.startsWith("on_")) {
            utils_1.logger.info({ mentionOpenId }, "Bot is mentioned!");
            return true;
        }
        // Also check mention key which might be "@_bot_" or "@_all"
        if (mention.key?.includes("@_bot_") || mention.key?.includes("_bot")) {
            utils_1.logger.info({ mentionKey: mention.key }, "Bot mention detected by key");
            return true;
        }
        // Check if mention name contains "bot" (case insensitive)
        if (mention.name?.toLowerCase().includes("bot")) {
            utils_1.logger.info({ mentionName: mention.name }, "Bot mention detected by name");
            return true;
        }
    }
    utils_1.logger.debug("Bot not mentioned in this message");
    return false;
}
//# sourceMappingURL=message.js.map