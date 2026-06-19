// ============================================
// Message Handler — processes incoming Lark IM message events
// ============================================

import { logger, extractTextFromContent } from "../utils";
import { imService } from "../services/im";
import { parseCommand } from "./commands";
import { executePipeline } from "./pipeline";
import type { LarkWebhookBody, ParsedMessage, LarkEvent, BotCommand } from "../types";

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

  // DEBUG: Log raw event data to understand mention structure
  logger.debug({ 
    mentions: event.message?.mentions,
    senderOpenId: event.sender?.sender_id?.open_id,
    messageContent: message.content
  }, "Raw webhook event data");

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
      // For group messages, check if text starts with @_user pattern
      // This is a fallback for when mentions array is not populated
      if (parsed.chatType === "group" && parsed.text.match(/^@_user_\d+/)) {
        logger.info("Group message starts with @mention pattern, treating as bot mention");
        // Re-parse as AI command, removing the mention prefix
        const cleanText = parsed.text.replace(/^@_user_\d+\s*/, "").trim();
        if (cleanText) {
          const aiCommand: BotCommand = { type: "ai", prompt: cleanText };
          logger.info({ cleanText }, "Executing as AI command with cleaned text");
          const reply = await executePipeline(parsed, aiCommand);
          if (reply) {
            logger.info({ replyLength: reply.length }, "Sending reply");
            await imService.sendText(parsed.chatId, reply, {
              replyToMessageId: message.root_id || message.message_id,
            });
            logger.info("Reply sent successfully");
          }
          return;
        }
      }
      
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
  
  // Log what we're working with
  logger.debug({ 
    hasMentions: !!mentions,
    mentionCount: mentions?.length || 0,
    rawMentions: mentions
  }, "Checking if bot is mentioned");
  
  if (!mentions || mentions.length === 0) {
    logger.debug("No mentions array in message");
    return false;
  }

  logger.debug({ 
    mentions: mentions.map(m => ({ 
      name: m.name, 
      openId: m.id?.open_id,
      key: m.key,
      tenantKey: m.tenant_key
    }))
  }, "Processing mentions");

  for (const mention of mentions) {
    const mentionOpenId = mention.id?.open_id;
    
    logger.debug({ 
      mentionOpenId, 
      mentionKey: mention.key, 
      mentionName: mention.name 
    }, "Checking individual mention");
    
    // Bot open IDs typically start with "on_" (app/bot prefix)
    if (mentionOpenId && mentionOpenId.startsWith("on_")) {
      logger.info({ mentionOpenId }, "✓ Bot is mentioned! (detected by openId)");
      return true;
    }
    
    // Also check mention key which might be "@_bot_" or similar
    // Some Lark deployments use "@_user_1" pattern where user_1 is the bot
    if (mention.key) {
      // Check if key contains bot-related patterns
      if (mention.key.includes("@_bot_") || mention.key.includes("_bot")) {
        logger.info({ mentionKey: mention.key }, "✓ Bot is mentioned! (detected by key pattern)");
        return true;
      }
    }
    
    // Check if mention name contains "bot" (case insensitive)
    if (mention.name?.toLowerCase().includes("bot")) {
      logger.info({ mentionName: mention.name }, "✓ Bot is mentioned! (detected by name)");
      return true;
    }
  }
  
  logger.debug("Bot not mentioned in this message");
  return false;
}
