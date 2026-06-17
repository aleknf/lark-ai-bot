"use strict";
// ============================================
// Lark AI Bot — Main Server Entry Point
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const utils_1 = require("./utils");
const webhook_1 = require("./routes/webhook");
const app = (0, express_1.default)();
const config = (0, config_1.getConfig)();
// --- Middleware ---
// Capture raw body buffer for webhook signature verification
app.use(express_1.default.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, _res, next) => {
    if (req.path === "/webhook") {
        utils_1.logger.debug({ method: req.method, path: req.path }, "Incoming webhook");
    }
    next();
});
// --- Routes ---
app.use(webhook_1.webhookRouter);
// Health check
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        models: {
            openrouter: config.OPENROUTER_MODEL,
        },
    });
});
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// --- Start Server ---
const server = app.listen(config.PORT, () => {
    utils_1.logger.info({
        port: config.PORT,
        env: config.NODE_ENV,
        model: config.OPENROUTER_MODEL,
    }, "🚀 Lark AI Bot server started");
    utils_1.logger.info(`   Webhook: POST http://localhost:${config.PORT}/webhook`);
    utils_1.logger.info(`   Health:  GET  http://localhost:${config.PORT}/health`);
    if (config.NODE_ENV === "development") {
        utils_1.logger.warn("   ⚠️  Development mode — use ngrok or cloudflare tunnel to expose webhook");
        utils_1.logger.warn("   Run: ngrok http " + config.PORT);
    }
});
// --- Graceful Shutdown ---
function shutdown(signal) {
    utils_1.logger.info({ signal }, "Shutting down gracefully");
    server.close(() => {
        utils_1.logger.info("Server closed");
        process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => {
        utils_1.logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
// Unhandled errors
process.on("uncaughtException", (err) => {
    utils_1.logger.error({ err }, "Uncaught exception");
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    utils_1.logger.error({ err: reason }, "Unhandled rejection");
});
//# sourceMappingURL=index.js.map