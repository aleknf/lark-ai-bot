// ============================================
// Message Handler — processes incoming Lark IM message events
// ============================================

import { logger, extractTextFromContent } from "../utils";
import { imService } from "../services/im";
import { parseCommand } from "./commands";
import { executePipeline } from "./pipeline";
import type { LarkWebhookBody, ParsedMessage, LarkEvent } from "../types";

/**
 * Handle a Lark message receive event.
 * This is the main entry point for incoming messages.
 */
export async function handleMessageEvent(body: LarkWebhookBody): Promise<void> {
  const event = body.event;
  if (!event?.message) {
    logger.warn("No message in event");
    return;
  }

  const message = event.message;

  // Skip messages from the bot itself
  if (isBotMessage(event)) {
    logger.debug("Skipping bot's own message");
    return;
  }

  // Parse the message
  const parsed: ParsedMessage = {
    messageId: message.message_id,
    chatId: message.chat_id,
    chatType: message.chat_type,
    senderOpenId: event.sender?.sender_id?.open_id || "",
    text: extractTextFromContent(message.content),
    isMentioned: isBotMentioned(event),
    rootId: message.root_id,
    parentId: message.parent_id,
    timestamp: Date.now(),
  };

  logger.info(
    {
      messageId: parsed.messageId,
      chatId: parsed.chatId,
      chatType: parsed.chatType,
      isMentioned: parsed.isMentioned,
      text: parsed.text.slice(0, 100),
    },
    "Received message"
  );

  if (!parsed.text.trim()) {
    logger.debug("Empty message text, skipping");
    return;
  }

  try {
    // Parse bot command
    const command = parseCommand(parsed);

    logger.info({ commandType: command.type }, "Parsed command");

    if (command.type === "unknown") {
      // Bot was not mentioned — ignore
      logger.debug("Unknown command, not mentioned — ignoring");
      return;
    }

    // Execute the AI pipeline
    logger.info({ commandType: command.type }, "Executing AI pipeline");
    const reply = await executePipeline(parsed, command);

    if (reply) {
      logger.info({ replyLength: reply.length }, "Sending reply");
      // Reply in thread if applicable, otherwise to chat
      await imService.sendText(parsed.chatId, reply, {
        replyToMessageId: message.root_id || message.message_id,
      });
      logger.info("Reply sent successfully");
    } else {
      logger.warn("Pipeline returned empty reply");
    }
  } catch (error) {
    logger.error({ err: error }, "Failed to handle message");
    try {
      await imService.sendText(
        parsed.chatId,
        `❌ Sorry, an error occurred while processing your request: ${error instanceof Error ? error.message : "Unknown error"}`,
        { replyToMessageId: message.message_id }
      );
    } catch (replyError) {
      logger.error({ err: replyError }, "Failed to send error reply");
    }
  }
}

/**
 * Check if the message sender is the bot itself.
 */
function isBotMessage(event: LarkEvent): boolean {
  const senderId = event.sender?.sender_id?.open_id || "";
  
  // Bot sender IDs typically start with "on_" (not "ou_" which is for users)
  if (senderId.startsWith("on_")) {
    logger.debug({ senderId }, "Detected bot's own message");
    return true;
  }
  
  // Empty sender ID is also suspicious
  if (!senderId) {
    logger.debug("Message has no sender ID, treating as bot message");
    return true;
  }
  
  return false;
}

/**
 * Check if the bot is mentioned in the message.
 */
function isBotMentioned(event: LarkEvent): boolean {
  const mentions = event.message?.mentions;
  
  if (!mentions || mentions.length === 0) {
    logger.debug("No mentions in message");
    return false;
  }

  logger.debug({ 
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
      logger.info({ mentionOpenId }, "Bot is mentioned!");
      return true;
    }
    
    // Also check mention key which might be "@_bot_" or "@_all"
    if (mention.key?.includes("@_bot_") || mention.key?.includes("_bot")) {
      logger.info({ mentionKey: mention.key }, "Bot mention detected by key");
      return true;
    }
    
    // Check if mention name contains "bot" (case insensitive)
    if (mention.name?.toLowerCase().includes("bot")) {
      logger.info({ mentionName: mention.name }, "Bot mention detected by name");
      return true;
    }
  }
  
  logger.debug("Bot not mentioned in this message");
  return false;
}
