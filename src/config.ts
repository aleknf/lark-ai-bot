// ============================================
// Configuration — validated from environment
// ============================================

import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const configSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  OPENROUTER_MODEL: z.string().default("openai/gpt-4o"),
  OPENROUTER_APP_NAME: z.string().optional(),
  OPENROUTER_APP_URL: z.string().optional(),

  // Lark Bot
  LARK_APP_ID: z.string().min(1, "LARK_APP_ID is required"),
  LARK_APP_SECRET: z.string().min(1, "LARK_APP_SECRET is required"),
  LARK_VERIFICATION_TOKEN: z.string().optional(),

  // Optional defaults
  LARK_DEFAULT_BASE_TOKEN: z.string().optional(),
  LARK_DEFAULT_SHEET_TOKEN: z.string().optional(),

  // AI Pipeline
  AI_MAX_CONTEXT_MESSAGES: z.coerce.number().default(20),
  AI_SYSTEM_PROMPT: z.string().default(
    "You are a helpful Lark bot assistant. You can help users search data in Lark Base, query Sheets, generate Docs reports, and answer questions. Be concise and helpful."
  ),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid configuration:");
      for (const issue of result.error.issues) {
        console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
      }
      process.exit(1);
    }
    _config = result.data;
  }
  return _config;
}

export function reloadConfig(): Config {
  _config = null;
  return getConfig();
}