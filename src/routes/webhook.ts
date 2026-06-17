// ============================================
// Webhook Route — POST /webhook for Lark event subscription
// ============================================

import { Router, type Request, type Response, raw } from "express";
import { logger, verifyLarkSignature } from "../utils";
import { handleMessageEvent } from "../handlers/message";
import type { LarkWebhookBody } from "../types";

export const webhookRouter = Router();

/**
 * POST /webhook
 * Receives Lark event subscription callbacks.
 * Uses raw body parser for exact signature verification,
 * then manually parses JSON.
 */
webhookRouter.post(
  "/webhook",
  raw({ type: "*/*", limit: "1mb" }),
  async (req: Request, res: Response) => {
    try {
      // Get raw body as UTF-8 string (exact bytes from HTTP request)
      const rawBody = req.body instanceof Buffer
        ? req.body.toString("utf8")
        : String(req.body || "");

      // Parse JSON manually
      let body: LarkWebhookBody;
      try {
        body = JSON.parse(rawBody) as LarkWebhookBody;
      } catch {
        res.status(400).json({ error: "Invalid JSON" });
        return;
      }

      // --- URL Verification (v2) ---
      if (body.challenge) {
        logger.info("Received URL verification challenge");
        res.json({ challenge: body.challenge });
        return;
      }

      // --- URL Verification (v1) ---
      if (body.type === "url_verification") {
        logger.info("Received URL verification (v1)");
        res.json({ challenge: body.challenge || body.token });
        return;
      }

      // --- Verify signature ---
      const timestamp = req.headers["x-lark-request-timestamp"] as string;
      const nonce = req.headers["x-lark-request-nonce"] as string;
      const signature = req.headers["x-lark-signature"] as string;

      if (timestamp && nonce && signature) {
        if (!verifyLarkSignature(timestamp, nonce, rawBody, signature)) {
          res.status(401).json({ error: "Invalid signature" });
          return;
        }
      }

      // --- Route by event type ---
      const eventType = body.header?.event_type || body.event?.type || "";

      logger.info({ eventType, eventId: body.header?.event_id }, "Processing event");

      if (
        eventType === "im.message.receive_v1" ||
        eventType === "im.message" ||
        eventType === "message"
      ) {
        // Process message asynchronously — respond 200 quickly
        res.status(200).json({ ok: true });

        setImmediate(() => {
          handleMessageEvent(body).catch((err) => {
            logger.error({ err }, "Async message handling failed");
          });
        });
        return;
      }

      // Acknowledge other event types
      logger.debug({ eventType }, "Ignoring unsupported event type");
      res.status(200).json({ ok: true });
    } catch (error) {
      logger.error({ err: error }, "Webhook error");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);
