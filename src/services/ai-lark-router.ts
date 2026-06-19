// ============================================
// AI-Powered Lark CLI Router
// Intelligently routes user requests to appropriate lark-cli commands
// ============================================

import { logger } from "../utils";
import { chatCompletion, buildMessages } from "./openrouter";
import { execLarkCommand, LARK_DOMAINS } from "./lark-cli";
import type { OpenRouterMessage } from "../types";

/**
 * AI-powered router that determines which lark-cli commands to execute
 * based on natural language input.
 */
export async function routeToLarkCLI(
  userPrompt: string,
  chatHistory: OpenRouterMessage[] = []
): Promise<{ success: boolean; data?: unknown; response: string }> {
  try {
    // Ask AI to determine which lark-cli command(s) to execute
    const systemPrompt = `You are a Lark CLI command router. Given a user's request, determine which lark-cli command(s) should be executed.

Available lark-cli domains: ${LARK_DOMAINS.join(", ")}

Common commands by domain:
- calendar: +agenda (view schedule), +create (create event), +update (update event), +freebusy (check availability)
- task: +get-my-tasks (list tasks), +create (create task), +update (update task)
- contact: +search-user (find users), +get-user (get user details)
- drive: +search (search files), +upload (upload file), +download (download file)
- mail: +list (list emails), +send (send email), +draft (create draft)
- approval: +list (list approvals), +approve (approve), +reject (reject)
- attendance: +query (check attendance records)
- okr: +list (list OKRs), +get (get OKR details)
- minutes: +list (list meeting minutes), +get (get minutes content)
- vc: +meeting-list (list meetings), +recording-download (download recording)
- whiteboard: +create (create board), +get (read board content)
- wiki: +search (search wiki), +create-space (create space)
- markdown: +create (create markdown file), +fetch (read markdown), +overwrite (update markdown)
- event: consume (listen to real-time events)

Respond with ONLY a JSON object in this format:
{
  "commands": [
    {
      "domain": "calendar",
      "args": ["+agenda", "--start", "2024-06-19T00:00:00+08:00", "--end", "2024-06-26T23:59:59+08:00"],
      "as": "user"
    }
  ],
  "explanation": "Brief explanation of what these commands will do"
}

If the request is not related to Lark functionality, respond with:
{
  "commands": [],
  "explanation": "This request is not related to Lark functionality."
}

IMPORTANT: 
- Always use ISO 8601 datetime format with timezone for dates
- Today is ${new Date().toISOString().split("T")[0]} (${new Date().toLocaleDateString("en-US", { weekday: "long" })})
- Use --as "user" for user-context operations, --as "bot" for bot operations
- For date ranges, be specific with start and end times
`;

    const messages = buildMessages(systemPrompt, chatHistory, userPrompt);
    const result = await chatCompletion(messages, { temperature: 0.3, maxTokens: 1000 });

    // Parse AI response
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI did not return valid JSON");
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      commands: Array<{ domain: string; args: string[]; as?: "bot" | "user" }>;
      explanation: string;
    };

    // If no commands, this is not a Lark-related request
    if (!parsed.commands || parsed.commands.length === 0) {
      return {
        success: false,
        response: parsed.explanation || "I couldn't determine how to help with that using Lark features.",
      };
    }

    // Execute commands sequentially
    const results: unknown[] = [];
    for (const cmd of parsed.commands) {
      try {
        const result = await execLarkCommand(cmd.domain, cmd.args, { as: cmd.as || "user" });
        results.push(result);
      } catch (error) {
        logger.error({ err: error, cmd }, "Failed to execute lark-cli command");
        results.push({ error: error instanceof Error ? error.message : "Unknown error" });
      }
    }

    // Now ask AI to format the results for the user
    const formatPrompt = `The user asked: "${userPrompt}"

You executed these Lark commands:
${parsed.commands.map((c, i) => `${i + 1}. ${c.domain} ${c.args.join(" ")}`).join("\n")}

Results:
${results.map((r, i) => `Command ${i + 1} result:\n${JSON.stringify(r, null, 2)}`).join("\n\n")}

Format these results into a clear, user-friendly response. Use bullet points, formatting, and emojis where appropriate. Be concise but informative.`;

    const formatMessages = buildMessages(
      "You are a helpful assistant that formats Lark data into user-friendly responses.",
      [],
      formatPrompt
    );

    const formatted = await chatCompletion(formatMessages, { temperature: 0.5, maxTokens: 2000 });

    return {
      success: true,
      data: results,
      response: formatted.content,
    };
  } catch (error) {
    logger.error({ err: error }, "AI Lark router failed");
    return {
      success: false,
      response: `❌ Failed to process your request: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Specialized handler for common user queries that can be optimized
 */
export async function handleCommonQuery(query: string): Promise<string | null> {
  const lowerQuery = query.toLowerCase();

  // Calendar/Schedule queries
  if (
    /\b(agenda|schedule|jadwal|kalender|calendar|meeting|rapat)\b/i.test(query) &&
    /\b(hari ini|today|besok|tomorrow|minggu ini|this week|pekan ini)\b/i.test(query)
  ) {
    return handleCalendarQuery(query);
  }

  // Task queries
  if (/\b(task|tugas|to[- ]?do)\b/i.test(query) && /\b(list|daftar|saya|my|aku)\b/i.test(query)) {
    return handleTaskQuery();
  }

  // Contact search
  if (/\b(cari|search|find)\b/i.test(query) && /\b(user|pengguna|orang|person|contact)\b/i.test(query)) {
    const match = query.match(/["']([^"']+)["']/) || query.match(/\b(?:cari|search|find)\s+(?:user|pengguna|orang)\s+(\w+)/i);
    if (match) {
      return handleContactSearch(match[1]);
    }
  }

  return null; // Not a common query, use full AI routing
}

async function handleCalendarQuery(query: string): Promise<string> {
  try {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const tz = now.getTimezoneOffset();
    const tzSign = tz <= 0 ? "+" : "-";
    const tzH = pad(Math.abs(Math.floor(tz / 60)));
    const tzM = pad(Math.abs(tz % 60));
    const formatDateTime = (d: Date, hour: string) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${hour}:00:00${tzSign}${tzH}:${tzM}`;

    let start: Date, end: Date, label: string;

    if (/\b(hari ini|today)\b/i.test(query)) {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = "Today";
    } else if (/\b(besok|tomorrow)\b/i.test(query)) {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      label = "Tomorrow";
    } else {
      // This week
      const dayOfWeek = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      end = new Date(start);
      end.setDate(start.getDate() + 7);
      label = "This Week";
    }

    const result = await execLarkCommand("calendar", [
      "+agenda",
      "--start", formatDateTime(start, "00"),
      "--end", formatDateTime(end, "23"),
      "--as", "user",
    ]);

    const events = (result as any)?.data || (result as any)?.events || [];
    if (events.length === 0) {
      return `📅 ${label}'s Calendar: No events scheduled.`;
    }

    const lines = [`📅 ${label}'s Calendar:`, ""];
    for (const ev of events) {
      const summary = ev.summary || "Untitled";
      const startObj = ev.start_time || ev.start;
      const startStr = typeof startObj === "object" ? (startObj.datetime || startObj.date) : String(startObj);
      const s = startStr ? new Date(startStr) : null;
      const dateStr = s
        ? s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        : "?";
      const timeStr = s ? s.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "?";
      lines.push(`  • ${dateStr} at ${timeStr} — ${summary}`);
    }

    return lines.join("\n");
  } catch (error) {
    logger.error({ err: error }, "Calendar query failed");
    return `❌ Failed to fetch calendar: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function handleTaskQuery(): Promise<string> {
  try {
    const result = await execLarkCommand("task", ["+get-my-tasks", "--as", "user"]);
    const tasks = (result as any)?.data?.items || (result as any)?.items || [];

    if (tasks.length === 0) {
      return "✅ Your Tasks: All clear! No pending tasks.";
    }

    const lines = ["✅ Your Tasks:", ""];
    const now = new Date();

    for (const t of tasks) {
      const name = t.summary || t.title || "Untitled Task";
      const dueStr = typeof t.due === "object" ? (t.due.date || t.due.timestamp) : (t.due_at || t.due);
      const isOverdue = dueStr ? new Date(dueStr) < now : false;
      const completed = t.is_completed || t.completed || t.status === "completed";
      const status = completed ? "✅" : isOverdue ? "⚠️" : "⏳";
      const dueLabel = dueStr
        ? ` — Due: ${new Date(dueStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        : "";
      lines.push(`  ${status} ${name}${dueLabel}`);
    }

    return lines.join("\n");
  } catch (error) {
    logger.error({ err: error }, "Task query failed");
    return `❌ Failed to fetch tasks: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

async function handleContactSearch(query: string): Promise<string> {
  try {
    const result = await execLarkCommand("contact", ["+search-user", "--query", query, "--as", "user"]);
    const users = (result as any)?.users || (result as any)?.data?.users || [];

    if (users.length === 0) {
      return `🔍 No users found matching "${query}".`;
    }

    const lines = [`🔍 Found ${users.length} user(s) matching "${query}":`, ""];
    for (const user of users.slice(0, 10)) {
      const name = user.localized_name || user.name || user.display_name || "Unknown";
      const email = user.email || user.enterprise_email || "";
      const dept = user.department_name || user.department || "";
      lines.push(`  • ${name}${email ? ` (${email})` : ""}${dept ? ` — ${dept}` : ""}`);
    }

    if (users.length > 10) {
      lines.push(`  ...and ${users.length - 10} more users.`);
    }

    return lines.join("\n");
  } catch (error) {
    logger.error({ err: error }, "Contact search failed");
    return `❌ Failed to search contacts: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
