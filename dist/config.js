"use strict";
// ============================================
// Configuration — validated from environment
// ============================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = getConfig;
exports.reloadConfig = reloadConfig;
const zod_1 = require("zod");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const configSchema = zod_1.z.object({
    // Server
    PORT: zod_1.z.coerce.number().default(3000),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    // OpenRouter
    OPENROUTER_API_KEY: zod_1.z.string().min(1, "OPENROUTER_API_KEY is required"),
    OPENROUTER_MODEL: zod_1.z.string().default("openai/gpt-4o"),
    OPENROUTER_APP_NAME: zod_1.z.string().optional(),
    OPENROUTER_APP_URL: zod_1.z.string().optional(),
    // Lark Bot
    LARK_APP_ID: zod_1.z.string().min(1, "LARK_APP_ID is required"),
    LARK_APP_SECRET: zod_1.z.string().min(1, "LARK_APP_SECRET is required"),
    LARK_VERIFICATION_TOKEN: zod_1.z.string().optional(),
    // Optional defaults
    LARK_DEFAULT_BASE_TOKEN: zod_1.z.string().optional(),
    LARK_DEFAULT_SHEET_TOKEN: zod_1.z.string().optional(),
    // AI Pipeline
    AI_MAX_CONTEXT_MESSAGES: zod_1.z.coerce.number().default(20),
    AI_SYSTEM_PROMPT: zod_1.z.string().default("You are a helpful Lark AI assistant with access to the user's real Lark data (calendar, tasks, chat history, Base, Sheets, Docs). When the user asks about their activities, schedule, meetings, or tasks, you will receive their actual data as context. When asked to summarize or review chats with a specific person, you will receive the chat history. Always use the provided data to give accurate, specific answers with dates, times, names, and message content. Never say you cannot access their data — it is already provided to you as context. Be concise, friendly, and helpful. Respond in the same language the user uses."),
});
let _config = null;
function getConfig() {
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
function reloadConfig() {
    _config = null;
    return getConfig();
}
//# sourceMappingURL=config.js.map