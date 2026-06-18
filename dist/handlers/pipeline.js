"use strict";
// ============================================
// AI Pipeline — orchestrates context gathering, LLM call, and actions
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.executePipeline = executePipeline;
const config_1 = require("../config");
const utils_1 = require("../utils");
const openrouter_1 = require("../services/openrouter");
const im_1 = require("../services/im");
const base_1 = require("../services/base");
const sheets_1 = require("../services/sheets");
const docs_1 = require("../services/docs");
const report_1 = require("../services/report");
const lark_cli_1 = require("../services/lark-cli");
/**
 * Execute the full AI pipeline for an incoming message.
 */
async function executePipeline(message, command) {
    const config = (0, config_1.getConfig)();
    try {
        // 1. Gather chat history context
        const chatHistory = await gatherChatHistory(message.chatId);
        // 2. Build context based on command type
        const context = {
            message,
            chatHistory,
        };
        // 3. Execute based on command
        switch (command.type) {
            case "help":
                return getHelpResponse();
            case "search":
                return await handleSearch(command, context);
            case "sheet":
                return await handleSheetQuery(command);
            case "report":
                return await handleReport(command, context, config);
            case "weekly":
                return await handleWeeklyReport();
            case "ai":
                return await handleAI(command, context, config);
            case "unknown":
                return "";
        }
    }
    catch (error) {
        // Handle permission denied — offer auth flow
        if (error instanceof lark_cli_1.PermissionDeniedError) {
            const { permission } = error;
            utils_1.logger.warn({ permission }, "Permission denied in pipeline");
            // Only user identity can be re-authorized; bot requires admin console
            if (permission.identity === "user" && permission.missingScopes.length > 0) {
                try {
                    const auth = await (0, lark_cli_1.initiateAuth)(permission.missingScopes);
                    return [
                        `🔐 **Permission Required**`,
                        ``,
                        `The bot needs additional permissions to access your **${permission.service}** data.`,
                        ``,
                        `🔗 **Authorize here:** ${auth.verificationUrl}`,
                        ``,
                        `⏳ This link expires in ${Math.round(auth.expiresIn / 60)} minutes.`,
                        `After authorizing, reply **/done** and I'll complete the setup.`,
                    ].join("\n");
                }
                catch (authError) {
                    utils_1.logger.error({ err: authError }, "Failed to initiate auth");
                    return `🔐 **Permission Required** — The bot needs access to **${permission.service}**. Please run \`lark-cli auth login --scope "${permission.missingScopes.join(",")}"\` to grant permissions.`;
                }
            }
            // Bot identity — direct to admin console
            if (permission.identity === "bot") {
                return `🔐 **Bot Permission Required** — The app needs additional scopes for **${permission.service}**. Please configure scopes in the Lark Developer Console.`;
            }
            // Fallback: no specific scopes known
            return `🔐 **Permission Denied** — The bot lacks permissions for **${permission.service}**. Try running \`lark-cli auth login --domain ${permission.service}\` to re-authorize.`;
        }
        utils_1.logger.error({ err: error }, "Pipeline execution failed");
        return `❌ Sorry, something went wrong: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}
// --- Context Gathering ---
async function gatherChatHistory(chatId) {
    try {
        const config = (0, config_1.getConfig)();
        const messages = await im_1.imService.getChatHistory(chatId, config.AI_MAX_CONTEXT_MESSAGES);
        return messages
            .filter((m) => m.text.trim())
            .map((m) => ({
            role: m.isBot ? "assistant" : "user",
            content: m.text,
        }))
            .reverse(); // Chronological order
    }
    catch (error) {
        utils_1.logger.warn({ err: error }, "Failed to gather chat history");
        return [];
    }
}
// --- Command Handlers ---
function getHelpResponse() {
    return [
        "🤖 **Lark AI Bot — Commands**",
        "",
        "• `/help` — Show this help",
        "• `/search <query>` — Search Lark Base records",
        "• `/sheet <query>` — Query Lark Sheets data",
        "• `/report [topic]` — Generate an AI Docs report",
        "• `/weekly` — Generate a weekly activity report (calendar + tasks)",
        "• `/ai <prompt>` — Ask the AI assistant",
        "",
        "Just mention me with any question too!",
    ].join("\n");
}
async function handleSearch(command, context) {
    const config = (0, config_1.getConfig)();
    const baseToken = config.LARK_DEFAULT_BASE_TOKEN;
    const tableId = config.LARK_DEFAULT_SHEET_TOKEN; // Hmm, there's no LARK_DEFAULT_TABLE_ID...
    if (!baseToken) {
        return "❌ No default Base configured. Set `LARK_DEFAULT_BASE_TOKEN` in your .env file.";
    }
    // For search, we need a table ID — use a system prompt that asks the AI to help if we can't find it
    if (!tableId) {
        // Try listing tables
        try {
            const { execLarkCLIJSON } = await Promise.resolve().then(() => __importStar(require("../services/lark-cli")));
            const tables = await execLarkCLIJSON([
                "base", "+table-list",
                "--base-token", baseToken,
                "--as", "user",
            ]);
            if (tables.items?.length) {
                const firstTable = tables.items[0];
                const records = await base_1.baseService.searchRecords(baseToken, firstTable.table_id, command.query);
                return formatSearchResults(records, command.query);
            }
            return `✅ Connected to Base \`${baseToken}\` but no tables found. Create a table first.`;
        }
        catch (error) {
            return `❌ Could not access Base: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
    }
    const records = await base_1.baseService.searchRecords(baseToken, tableId, command.query);
    return formatSearchResults(records, command.query);
}
function formatSearchResults(records, query) {
    if (records.length === 0) {
        return `🔍 No results found for "${query}".`;
    }
    const lines = [`🔍 Found ${records.length} result(s) for "${query}":`, ""];
    for (const record of records.slice(0, 10)) {
        const fields = Object.entries(record.fields)
            .map(([k, v]) => `  ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
            .join("\n");
        lines.push(`📋 Record \`${record.record_id}\`:\n${fields}`, "");
    }
    if (records.length > 10) {
        lines.push(`...and ${records.length - 10} more results.`);
    }
    return lines.join("\n");
}
async function handleSheetQuery(command) {
    const config = (0, config_1.getConfig)();
    const sheetToken = config.LARK_DEFAULT_SHEET_TOKEN;
    if (!sheetToken) {
        return "❌ No default Sheet configured. Set `LARK_DEFAULT_SHEET_TOKEN` in your .env file.";
    }
    try {
        // Try reading the range directly if it looks like a range (e.g., "A1:B10")
        const rangeMatch = command.query.match(/^([A-Z]+\d+)(?::([A-Z]+\d+))?$/i);
        if (rangeMatch) {
            const range = rangeMatch[0];
            const data = await sheets_1.sheetsService.readRange(sheetToken, range);
            return formatSheetData(data.values, range);
        }
        // Otherwise treat as a general query — read first 50 rows
        const data = await sheets_1.sheetsService.readRange(sheetToken, "A1:Z50");
        return formatSheetData(data.values, "A1:Z50");
    }
    catch (error) {
        return `❌ Sheet query failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}
function formatSheetData(values, range) {
    if (!values || values.length === 0) {
        return `📊 Range \`${range}\` is empty.`;
    }
    const lines = [`📊 Sheet data (\`${range}\`):`, ""];
    const maxRows = Math.min(values.length, 20);
    for (let i = 0; i < maxRows; i++) {
        const row = values[i] || [];
        lines.push(`  Row ${i + 1}: ${row.map((c) => String(c ?? "")).join(" | ")}`);
    }
    if (values.length > 20) {
        lines.push(`  ...and ${values.length - 20} more rows.`);
    }
    return lines.join("\n");
}
async function handleReport(command, context, config) {
    const topic = command.topic || "General Report";
    try {
        // Gather data from Base if configured
        let baseData = "";
        if (config.LARK_DEFAULT_BASE_TOKEN) {
            const { execLarkCLIJSON } = await Promise.resolve().then(() => __importStar(require("../services/lark-cli")));
            try {
                const tables = await execLarkCLIJSON([
                    "base", "+table-list",
                    "--base-token", config.LARK_DEFAULT_BASE_TOKEN,
                    "--as", "user",
                ]);
                if (tables.items?.length) {
                    const firstTable = tables.items[0];
                    const records = await base_1.baseService.listRecords(config.LARK_DEFAULT_BASE_TOKEN, firstTable.table_id, { limit: 50 });
                    if (records.items.length) {
                        baseData = `\n\nAvailable Base data (table: ${firstTable.name}, ${records.items.length} records):\n${JSON.stringify(records.items.slice(0, 10), null, 2)}`;
                    }
                }
            }
            catch (e) {
                utils_1.logger.warn({ err: e }, "Could not fetch Base data for report");
            }
        }
        // Ask AI to generate report
        const reportPrompt = `Generate a structured report on the topic: "${topic}".${baseData}\n\nFormat the report with clear sections, bullet points where appropriate, and a summary. Use Markdown formatting.`;
        const messages = (0, openrouter_1.buildMessages)("You are a report generation assistant. Generate well-structured, professional reports with clear sections and formatting.", context.chatHistory, reportPrompt);
        const result = await (0, openrouter_1.chatCompletion)(messages, { temperature: 0.3, maxTokens: 3000 });
        // Create a Lark Doc with the report
        try {
            const doc = await docs_1.docsService.createDoc(`Report: ${topic}`, result.content);
            return `📄 Report generated and saved to Lark Doc!\n\n**Title:** ${topic}\n**Doc:** ${doc.document.url || `\`${doc.document.document_id}\``}\n\n**Preview:**\n${result.content.slice(0, 500)}...`;
        }
        catch (docError) {
            // If doc creation fails, just return the report text
            return `📄 **Report: ${topic}**\n\n${result.content}`;
        }
    }
    catch (error) {
        return `❌ Report generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}
async function handleWeeklyReport() {
    try {
        return await (0, report_1.generateWeeklyReport)();
    }
    catch (error) {
        utils_1.logger.error({ err: error }, "Weekly report generation failed");
        return `❌ Weekly report generation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    }
}
async function handleAI(command, context, config) {
    // Detect if user is asking about their activities, schedule, calendar, or tasks
    const prompt = command.prompt.toLowerCase();
    const isActivityQuery = /aktivitas|activity|schedule|jadwal|kalender|calendar|task|tugas|meeting|rapat|minggu ini|hari ini|this week|today|besok|tomorrow|agenda/i.test(prompt);
    // Detect chat summarization requests: "rangkum chat dari X", "summarize chat from X", etc.
    const chatSummaryMatch = command.prompt.match(/(?:rangkum|ringkas|summarize|ringkasan|summary|kesimpulan)\s+(?:chat|pesan|message|obrolan|percakapan|dm)\s+(?:dari|dengan|from|with)\s+(.+)/i);
    // Also match patterns like "rangkum chat 'Lia Pitaloka' seminggu ini"
    const chatSummaryMatch2 = command.prompt.match(/(?:rangkum|ringkas|summarize|ringkasan|summary)\s+(?:chat|pesan|message|obrolan)\s+['""](.+?)['""]/i);
    let chatPerson = chatSummaryMatch?.[1]?.trim() || chatSummaryMatch2?.[1]?.trim();
    // Strip trailing time phrases from the captured name
    if (chatPerson) {
        chatPerson = chatPerson.replace(/\s+(?:seminggu|sepekan|minggu\s+ini|minggu\s+lalu|minggu\s+depan|hari\s+ini|hari\s+kemarin|besok|kemarin|bulan\s+ini|bulan\s+lalu|this\s+week|last\s+week|next\s+week|today|yesterday|tomorrow|this\s+month|last\s+month)(?:\s+(?:ini|terakhir|lalu))?\s*$/i, "").trim();
    }
    let dataContext = "";
    if (chatPerson) {
        try {
            dataContext = await fetchChatSummaryContext(chatPerson);
        }
        catch (err) {
            utils_1.logger.warn({ err }, "Failed to fetch chat summary context");
            return `❌ Could not fetch chat history for **${chatPerson}**: ${err instanceof Error ? err.message : "Unknown error"}`;
        }
    }
    else if (isActivityQuery) {
        try {
            dataContext = await fetchUserActivityContext();
        }
        catch (err) {
            utils_1.logger.warn({ err }, "Failed to fetch activity context for AI query");
        }
    }
    const systemPrompt = dataContext
        ? `${config.AI_SYSTEM_PROMPT}\n\n--- USER DATA CONTEXT ---\n${dataContext}\n---\nUse the data above to answer the user's question accurately. Always include specific dates, times, and event/task names from the data.`
        : config.AI_SYSTEM_PROMPT;
    const messages = (0, openrouter_1.buildMessages)(systemPrompt, context.chatHistory, command.prompt);
    const result = await (0, openrouter_1.chatCompletion)(messages, { temperature: 0.7, maxTokens: 2000 });
    return result.content;
}
/**
 * Fetch calendar events and tasks for the current user to provide as AI context.
 */
async function fetchUserActivityContext() {
    const { execLarkCLIJSON } = await Promise.resolve().then(() => __importStar(require("../services/lark-cli")));
    const parts = [];
    // Fetch this week's calendar
    try {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const dayOfWeek = now.getDay();
        const thisMonday = new Date(now);
        thisMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const thisSunday = new Date(thisMonday);
        thisSunday.setDate(thisMonday.getDate() + 6);
        const tz = now.getTimezoneOffset();
        const tzSign = tz <= 0 ? "+" : "-";
        const tzH = pad(Math.abs(Math.floor(tz / 60)));
        const tzM = pad(Math.abs(tz % 60));
        const fmt = (d, hh) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hh}:00:00${tzSign}${tzH}:${tzM}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const calResult = await execLarkCLIJSON([
            "calendar", "+agenda",
            "--start", fmt(thisMonday, "00"),
            "--end", fmt(thisSunday, "23"),
            "--as", "user",
        ]);
        const events = Array.isArray(calResult?.data) ? calResult.data : (calResult?.events || []);
        if (events.length > 0) {
            parts.push("📅 **This Week's Calendar:**");
            for (const ev of events) {
                const summary = ev.summary || "Untitled";
                const startObj = ev.start_time || ev.start;
                const endObj = ev.end_time || ev.end;
                const startStr = typeof startObj === "object" && startObj
                    ? (startObj.datetime || startObj.date || "")
                    : String(startObj || "");
                const endStr = typeof endObj === "object" && endObj
                    ? (endObj.datetime || endObj.date || "")
                    : String(endObj || "");
                const s = startStr ? new Date(startStr) : null;
                const e = endStr ? new Date(endStr) : null;
                const dateStr = s ? s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : "?";
                const timeStr = s && e
                    ? `${s.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} – ${e.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`
                    : "?";
                parts.push(`  • ${dateStr} | ${timeStr} | ${summary}`);
            }
        }
        else {
            parts.push("📅 **This Week's Calendar:** No meetings found.");
        }
    }
    catch (err) {
        utils_1.logger.warn({ err }, "Calendar fetch for AI context failed");
    }
    // Fetch tasks
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskResult = await execLarkCLIJSON(["task", "+get-my-tasks", "--as", "user"]);
        const tasks = taskResult?.data?.items || taskResult?.items || [];
        if (tasks.length > 0) {
            const now = new Date();
            parts.push("");
            parts.push("✅ **Your Tasks:**");
            for (const t of tasks) {
                const name = t.summary || "Untitled Task";
                const dueStr = typeof t.due === "object" && t.due
                    ? (t.due.date || t.due.timestamp || "")
                    : (t.due_at || t.due || "");
                const isOverdue = dueStr ? new Date(dueStr) < now : false;
                const status = t.is_completed || t.completed ? "✅" : isOverdue ? "⚠️ OVERDUE" : "⏳";
                const dueLabel = dueStr
                    ? ` — Due: ${new Date(dueStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                    : "";
                parts.push(`  ${status} ${name}${dueLabel}`);
            }
        }
        else {
            parts.push("✅ **Your Tasks:** No tasks found.");
        }
    }
    catch (err) {
        utils_1.logger.warn({ err }, "Task fetch for AI context failed");
    }
    return parts.join("\n");
}
/**
 * Fetch and format chat messages from a specific person for AI summarization.
 * Searches for the user by name, then fetches recent P2P messages.
 */
async function fetchChatSummaryContext(personName) {
    const { execLarkCLIJSON } = await Promise.resolve().then(() => __importStar(require("../services/lark-cli")));
    const parts = [];
    // Step 1: Search for the user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchResult = await execLarkCLIJSON([
        "contact", "+search-user",
        "--query", personName,
        "--as", "user",
    ]);
    const users = searchResult?.users || searchResult?.data?.users || [];
    if (users.length === 0) {
        return `⚠️ Could not find a user matching "${personName}". Please check the name.`;
    }
    const user = users[0];
    const userId = user.open_id || user.id;
    const userName = user.localized_name || user.name || user.display_name || personName;
    if (!userId) {
        return `⚠️ Found "${userName}" but could not determine user ID for fetching messages.`;
    }
    // Step 2: Fetch messages from the last 7 days
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const iso = (d, isEnd) => {
        const pad = (n) => String(n).padStart(2, "0");
        const tz = d.getTimezoneOffset();
        const tzSign = tz <= 0 ? "+" : "-";
        const tzH = pad(Math.abs(Math.floor(tz / 60)));
        const tzM = pad(Math.abs(tz % 60));
        const hh = isEnd ? "23" : "00";
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hh}:59:59${tzSign}${tzH}:${tzM}`;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msgResult = await execLarkCLIJSON([
        "im", "+chat-messages-list",
        "--user-id", userId,
        "--start", iso(weekAgo, false),
        "--end", iso(now, true),
        "--page-size", "50",
        "--sort", "asc",
        "--as", "user",
    ]);
    // Response uses data.messages, not data.items
    const messages = msgResult?.data?.messages || msgResult?.items || msgResult?.data?.items || [];
    if (messages.length === 0) {
        return `📭 No messages found with **${userName}** in the last 7 days.`;
    }
    parts.push(`💬 **Chat with ${userName}** — last 7 days (${messages.length} messages):`);
    parts.push("");
    for (const msg of messages) {
        // Sender info: use sender.name from the nested object
        const senderName = msg.sender?.name || msg.sender_name || "Unknown";
        // Determine if it's from the other person or from you
        const senderId = msg.sender?.id || msg.sender_id || "";
        const label = senderId === userId ? userName : "You";
        const text = extractChatMessageText(msg) || "[media/file]";
        // create_time can be a string like "2026-06-15 11:23" or a unix timestamp
        const time = formatChatTime(msg.create_time);
        parts.push(`  [${time}] ${label}: ${text}`);
    }
    return parts.join("\n");
}
/**
 * Format a chat message create_time to a readable string.
 * Handles both ISO-like strings ("2026-06-15 11:23") and unix timestamps.
 */
function formatChatTime(createTime) {
    if (!createTime)
        return "?";
    try {
        let d;
        if (typeof createTime === "string" && createTime.includes("-")) {
            // String format like "2026-06-15 11:23"
            d = new Date(createTime.replace(" ", "T"));
        }
        else {
            // Unix timestamp (seconds)
            d = new Date(parseInt(String(createTime), 10) * 1000);
        }
        if (isNaN(d.getTime()))
            return "?";
        return d.toLocaleString("en-US", {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
        });
    }
    catch {
        return "?";
    }
}
/**
 * Extract text from a chat message.
 * Handles both the flat `content` field (from +chat-messages-list) and
 * the nested `body.content` JSON structure (from webhook events).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractChatMessageText(item) {
    // Flat content field (from +chat-messages-list)
    if (typeof item.content === "string" && item.content) {
        return item.content;
    }
    // Nested body.content (from webhook/event messages)
    if (!item.body?.content)
        return "";
    try {
        const content = typeof item.body.content === "string"
            ? JSON.parse(item.body.content)
            : item.body.content;
        if (content.text)
            return content.text;
        if (content.content) {
            const texts = [];
            for (const block of content.content) {
                if (Array.isArray(block)) {
                    for (const el of block) {
                        if (el.tag === "text" && el.text)
                            texts.push(el.text);
                    }
                }
            }
            return texts.join("");
        }
        return "";
    }
    catch {
        return item.body.content || "";
    }
}
//# sourceMappingURL=pipeline.js.map