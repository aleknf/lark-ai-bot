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

    if (command.type === "unknown") {
      // Bot was not mentioned — ignore
      logger.debug("Unknown command, not mentioned — ignoring");
      return;
    }

    // Execute the AI pipeline
    const reply = await executePipeline(parsed, command);

    if (reply) {
      // Reply in thread if applicable, otherwise to chat
      await imService.sendText(parsed.chatId, reply, {
        replyToMessageId: message.root_id || message.message_id,
      });
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
  const appId = process.env.LARK_APP_ID || "";
  const senderId = event.sender?.sender_id?.open_id || "";
  // Bot messages typically have a sender_id matching the app's bot open_id pattern
  return senderId.includes("ou_") === false || senderId === "";
}

/**
 * Check if the bot is mentioned in the message.
 */
function isBotMentioned(event: LarkEvent): boolean {
  if (!event.message?.mentions?.length) return false;

  const appId = process.env.LARK_APP_ID || "";
  for (const mention of event.message.mentions) {
    // Mentions have an id that may match the bot's open_id pattern
    if (mention.id?.open_id && mention.id.open_id.includes("ou_") === false) {
      return true;
    }
    // Check by tenant_key match
    if (mention.tenant_key === event.sender?.tenant_key) {
      // Name-based check as fallback
      if (mention.name?.toLowerCase().includes("bot")) return true;
    }
  }
  return false;
}
