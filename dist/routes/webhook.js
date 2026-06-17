"use strict";
// ============================================
// Webhook Route — POST /webhook for Lark event subscription
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookRouter = void 0;
const express_1 = require("express");
const utils_1 = require("../utils");
const message_1 = require("../handlers/message");
exports.webhookRouter = (0, express_1.Router)();
/**
 * POST /webhook
 * Receives Lark event subscription callbacks.
 * Uses raw body parser for exact signature verification,
 * then manually parses JSON.
 */
exports.webhookRouter.post("/webhook", (0, express_1.raw)({ type: "*/*", limit: "1mb" }), async (req, res) => {
    try {
        // Get raw body as UTF-8 string (exact bytes from HTTP request)
        const rawBody = req.body instanceof Buffer
            ? req.body.toString("utf8")
            : String(req.body || "");
        // Parse JSON manually
        let body;
        try {
            body = JSON.parse(rawBody);
        }
        catch {
            res.status(400).json({ error: "Invalid JSON" });
            return;
        }
        // --- URL Verification (v2) ---
        if (body.challenge) {
            utils_1.logger.info("Received URL verification challenge");
            res.json({ challenge: body.challenge });
            return;
        }
        // --- URL Verification (v1) ---
        if (body.type === "url_verification") {
            utils_1.logger.info("Received URL verification (v1)");
            res.json({ challenge: body.challenge || body.token });
            return;
        }
        // --- Verify signature ---
        const timestamp = req.headers["x-lark-request-timestamp"];
        const nonce = req.headers["x-lark-request-nonce"];
        const signature = req.headers["x-lark-signature"];
        if (timestamp && nonce && signature) {
            if (!(0, utils_1.verifyLarkSignature)(timestamp, nonce, rawBody, signature)) {
                res.status(401).json({ error: "Invalid signature" });
                return;
            }
        }
        // --- Route by event type ---
        const eventType = body.header?.event_type || body.event?.type || "";
        utils_1.logger.info({ eventType, eventId: body.header?.event_id }, "Processing event");
        if (eventType === "im.message.receive_v1" ||
            eventType === "im.message" ||
            eventType === "message") {
            // Process message asynchronously — respond 200 quickly
            res.status(200).json({ ok: true });
            setImmediate(() => {
                (0, message_1.handleMessageEvent)(body).catch((err) => {
                    utils_1.logger.error({ err }, "Async message handling failed");
                });
            });
            return;
        }
        // Acknowledge other event types
        utils_1.logger.debug({ eventType }, "Ignoring unsupported event type");
        res.status(200).json({ ok: true });
    }
    catch (error) {
        utils_1.logger.error({ err: error }, "Webhook error");
        res.status(500).json({ error: "Internal server error" });
    }
});
//# sourceMappingURL=webhook.js.map