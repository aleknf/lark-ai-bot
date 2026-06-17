// ============================================
// Lark AI Bot — Main Server Entry Point
// ============================================

import express from "express";
import { getConfig } from "./config";
import { logger } from "./utils";
import { webhookRouter } from "./routes/webhook";

const app = express();
const config = getConfig();

// --- Middleware ---
// JSON body parser for all routes EXCEPT /webhook (which uses raw parser)
app.use((req, _res, next) => {
  if (req.path === "/webhook" && req.method === "POST") {
    return next(); // skip — webhook route has its own raw parser
  }
  express.json({ limit: "1mb" })(req, _res, next);
});
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  if (req.path === "/webhook") {
    logger.debug({ method: req.method, path: req.path }, "Incoming webhook");
  }
  next();
});

// --- Routes ---
app.use(webhookRouter);

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
  logger.info(
    {
      port: config.PORT,
      env: config.NODE_ENV,
      model: config.OPENROUTER_MODEL,
    },
    "🚀 Lark AI Bot server started"
  );
  logger.info(`   Webhook: POST http://localhost:${config.PORT}/webhook`);
  logger.info(`   Health:  GET  http://localhost:${config.PORT}/health`);

  if (config.NODE_ENV === "development") {
    logger.warn(
      "   ⚠️  Development mode — use ngrok or cloudflare tunnel to expose webhook"
    );
    logger.warn(
      "   Run: ngrok http " + config.PORT
    );
  }
});

// --- Graceful Shutdown ---
function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down gracefully");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });

  // Force exit after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Unhandled errors
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled rejection");
});
