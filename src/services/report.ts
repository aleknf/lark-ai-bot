// ============================================
// Weekly Report Service — calendar + tasks via lark-cli
// ============================================

import { execLarkCLIJSON } from "./lark-cli";
import { docsService } from "./docs";
import { logger } from "../utils";

// ============================================
// Types
// ============================================

interface CalendarEvent {
  summary: string;
  startTime: string;
  endTime: string;
  status: string;
  duration: number; // minutes
}

interface TaskItem {
  name: string;
  status: "completed" | "in_progress" | "overdue";
  dueDate?: string;
  description?: string;
}

interface WeeklyReportData {
  lastWeek: {
    events: CalendarEvent[];
    totalMeetings: number;
    totalMinutes: number;
  };
  nextWeek: {
    events: CalendarEvent[];
    totalMeetings: number;
  };
  tasks: {
    completed: TaskItem[];
    inFlight: TaskItem[];
    overdue: TaskItem[];
  };
}

// ============================================
// Date Helpers
// ============================================

function formatISO(date: Date, time: "start" | "end"): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const tz = date.getTimezoneOffset();
  const tzSign = tz <= 0 ? "+" : "-";
  const tzH = pad(Math.abs(Math.floor(tz / 60)));
  const tzM = pad(Math.abs(tz % 60));

  const hh = time === "start" ? "00" : "23";
  const mm = time === "start" ? "00" : "59";
  const ss = "00";

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${hh}:${mm}:${ss}${tzSign}${tzH}:${tzM}`;
}

interface DateRange {
  start: string;
  end: string;
}

function getLastWeekRange(): DateRange {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun

  // Last Monday
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - dayOfWeek - 6);

  // Last Sunday
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);

  return {
    start: formatISO(lastMonday, "start"),
    end: formatISO(lastSunday, "end"),
  };
}

function getNextWeekRange(): DateRange {
  const now = new Date();
  const dayOfWeek = now.getDay();

  // Next Monday
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? 1 : 8));

  // Next Sunday
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  return {
    start: formatISO(nextMonday, "start"),
    end: formatISO(nextSunday, "end"),
  };
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ============================================
// Data Fetching
// ============================================

async function fetchCalendarEvents(start: string, end: string): Promise<CalendarEvent[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await execLarkCLIJSON([
      "calendar", "+agenda",
      "--start", start,
      "--end", end,
      "--as", "user",
    ]);

    // Calendar response: { ok, data: [...] }, not { events: [...] }
    const events = Array.isArray(result?.data) ? result.data : (result?.events || []);
    logger.info({ eventCount: events.length }, "Calendar events fetched");

    return (events as Array<{
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      status?: string;
    }>)
      .filter((e) => {
        const summary = (e.summary || "").toLowerCase();
        // Filter out non-work events
        const skip = ["clock out", "clock in", "break", "lunch"];
        return !skip.some((s) => summary.includes(s));
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((e: any) => {
        const startTime = e.start_time || e.start?.dateTime || e.start?.date || "";
        const endTime = e.end_time || e.end?.dateTime || e.end?.date || "";
        const duration = startTime && endTime
          ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
          : 0;

        return {
          summary: e.summary || "Untitled",
          startTime,
          endTime,
          status: e.status || "unknown",
          duration,
        };
      });
  } catch (error) {
    logger.warn({ err: error }, "Failed to fetch calendar events");
    return [];
  }
}

async function fetchTasks(): Promise<TaskItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await execLarkCLIJSON(["task", "+get-my-tasks", "--as", "user"]);

    // Task response: { ok, data: { items: [...] } }, not { tasks: [...] }
    const tasks = result?.data?.items || result?.tasks || result?.items || [];
    if (tasks.length > 0) {
      logger.info({ taskCount: tasks.length, sampleKeys: Object.keys(tasks[0]) }, "Tasks fetched");
    } else {
      logger.info("No tasks found in response");
    }

    const now = new Date();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tasks.map((t: any) => {
      // due_at is a flat ISO string; also support nested due.date / due.timestamp
      const dueStr = typeof t.due === "object" && t.due
        ? (t.due.date || t.due.timestamp || "")
        : (t.due_at || t.due || "");
      const isOverdue = dueStr ? new Date(dueStr) < now : false;
      // +get-my-tasks returns incomplete tasks only; check completed/status for safety
      const isCompleted = t.is_completed || t.completed || t.status === "completed" || false;

      let status: TaskItem["status"];
      if (isCompleted) status = "completed";
      else if (isOverdue) status = "overdue";
      else status = "in_progress";

      return {
        name: t.summary || "Untitled Task",
        status,
        dueDate: dueStr || undefined,
        description: t.description || undefined,
      };
    });
  } catch (error) {
    logger.warn({ err: error }, "Failed to fetch tasks");
    return [];
  }
}

// ============================================
// Report Generation
// ============================================

function buildReportXML(data: WeeklyReportData): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const { lastWeek, nextWeek, tasks } = data;
  const completedCount = tasks.completed.length;
  const inFlightCount = tasks.inFlight.length;
  const overdueCount = tasks.overdue.length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<docx>\n`;

  // --- Title ---
  xml += `<title>Weekly Activity Report — ${dateStr}</title>\n`;

  // --- Header ---
  xml += `<heading level="1">📊 Weekly Activity Report</heading>\n`;
  xml += `<p><b>Generated:</b> ${dateStr}</p>\n`;
  xml += `<p><b>Period:</b> Last Week (${formatDate(lastWeek.events[0]?.startTime || "")} – ${formatDate(lastWeek.events[lastWeek.events.length - 1]?.startTime || "")}) | Next Week Preview</p>\n`;
  xml += `<divider></divider>\n`;

  // --- Section: Last Week ---
  xml += `<heading level="2">📅 Last Week Activity</heading>\n`;
  if (lastWeek.events.length === 0) {
    xml += `<p>No meetings or events recorded for last week.</p>\n`;
  } else {
    xml += `<p><b>Total:</b> ${lastWeek.totalMeetings} meetings (${formatDuration(lastWeek.totalMinutes)})</p>\n`;
    xml += `<table>\n`;
    xml += `<tr><th>Date</th><th>Event</th><th>Time</th><th>Duration</th></tr>\n`;
    for (const ev of lastWeek.events) {
      xml += `<tr><td>${formatDate(ev.startTime)}</td><td>${escapeXml(ev.summary)}</td><td>${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}</td><td>${formatDuration(ev.duration)}</td></tr>\n`;
    }
    xml += `</table>\n`;
  }
  xml += `<divider></divider>\n`;

  // --- Section: Next Week ---
  xml += `<heading level="2">🔮 Next Week Preview</heading>\n`;
  if (nextWeek.events.length === 0) {
    xml += `<p>No upcoming meetings scheduled for next week.</p>\n`;
  } else {
    xml += `<p><b>Upcoming:</b> ${nextWeek.totalMeetings} meetings</p>\n`;
    xml += `<table>\n`;
    xml += `<tr><th>Date</th><th>Event</th><th>Time</th></tr>\n`;
    for (const ev of nextWeek.events) {
      xml += `<tr><td>${formatDate(ev.startTime)}</td><td>${escapeXml(ev.summary)}</td><td>${formatTime(ev.startTime)} – ${formatTime(ev.endTime)}</td></tr>\n`;
    }
    xml += `</table>\n`;
  }
  xml += `<divider></divider>\n`;

  // --- Section: Tasks ---
  xml += `<heading level="2">✅ Task Summary</heading>\n`;

  if (completedCount > 0) {
    xml += `<heading level="3">Completed (${completedCount})</heading>\n`;
    for (const t of tasks.completed) {
      xml += `<p>✅ ${escapeXml(t.name)}</p>\n`;
    }
  }

  if (inFlightCount > 0) {
    xml += `<heading level="3">In Progress (${inFlightCount})</heading>\n`;
    for (const t of tasks.inFlight) {
      const due = t.dueDate ? ` — Due: ${formatDate(t.dueDate)}` : "";
      xml += `<p>⏳ <b>${escapeXml(t.name)}</b>${due}</p>\n`;
    }
  }

  if (overdueCount > 0) {
    xml += `<callout emoji-id="⚠️" background-color="1">\n`;
    xml += `<p><b>Overdue Tasks (${overdueCount})</b></p>\n`;
    for (const t of tasks.overdue) {
      const due = t.dueDate ? ` — Due: ${formatDate(t.dueDate)}` : "";
      xml += `<p>• <b>${escapeXml(t.name)}</b>${due}</p>\n`;
    }
    xml += `</callout>\n`;
  }

  if (completedCount === 0 && inFlightCount === 0 && overdueCount === 0) {
    xml += `<p>No tasks found.</p>\n`;
  }

  xml += `<divider></divider>\n`;

  // --- Section: Metrics ---
  xml += `<heading level="2">📈 Quick Stats</heading>\n`;
  xml += `<grid column-size="2">\n`;
  xml += `<grid-column>\n`;
  xml += `<callout emoji-id="📅" background-color="2">\n`;
  xml += `<p><b>Last Week Meetings</b></p>\n`;
  xml += `<p style="font-size: 24px; text-align: center;"><b>${lastWeek.totalMeetings}</b></p>\n`;
  xml += `<p style="text-align: center;">meetings</p>\n`;
  xml += `</callout>\n`;
  xml += `</grid-column>\n`;
  xml += `<grid-column>\n`;
  xml += `<callout emoji-id="⏱️" background-color="3">\n`;
  xml += `<p><b>Meeting Time</b></p>\n`;
  xml += `<p style="font-size: 24px; text-align: center;"><b>${formatDuration(lastWeek.totalMinutes)}</b></p>\n`;
  xml += `<p style="text-align: center;">in meetings</p>\n`;
  xml += `</callout>\n`;
  xml += `</grid-column>\n`;
  xml += `</grid>\n`;

  xml += `<divider></divider>\n`;
  xml += `<heading level="2">📝 Notes</heading>\n`;
  xml += `<p>• Tasks: ${completedCount} completed, ${inFlightCount} in progress, ${overdueCount} overdue</p>\n`;
  xml += `<p>• Next week: ${nextWeek.totalMeetings} meetings scheduled</p>\n`;
  xml += `<p>• Generated automatically by Lark AI Bot</p>\n`;

  xml += `</docx>`;
  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
}

// ============================================
// Public API
// ============================================

export async function generateWeeklyReport(): Promise<string> {
  logger.info("Generating weekly activity report...");

  // Fetch data in parallel
  const [lastWeekEvents, nextWeekEvents, tasks] = await Promise.all([
    fetchCalendarEvents(getLastWeekRange().start, getLastWeekRange().end),
    fetchCalendarEvents(getNextWeekRange().start, getNextWeekRange().end),
    fetchTasks(),
  ]);

  const data: WeeklyReportData = {
    lastWeek: {
      events: lastWeekEvents,
      totalMeetings: lastWeekEvents.length,
      totalMinutes: lastWeekEvents.reduce((sum, e) => sum + e.duration, 0),
    },
    nextWeek: {
      events: nextWeekEvents,
      totalMeetings: nextWeekEvents.length,
    },
    tasks: {
      completed: tasks.filter((t) => t.status === "completed"),
      inFlight: tasks.filter((t) => t.status === "in_progress"),
      overdue: tasks.filter((t) => t.status === "overdue"),
    },
  };

  // Build report XML
  const reportXml = buildReportXML(data);

  // Create Lark Doc
  try {
    const now = new Date();
    const title = `Weekly Report — ${now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    const doc = await docsService.createDoc(title, reportXml);
    const url = doc.document.url || `https://internal.larksuite.com/docs/${doc.document.document_id}`;

    const summary = [
      `📊 **Weekly Activity Report Generated!**`,
      ``,
      `📄 **Doc:** ${url}`,
      ``,
      `📅 **Last Week:** ${data.lastWeek.totalMeetings} meetings (${formatDuration(data.lastWeek.totalMinutes)})`,
      `🔮 **Next Week:** ${data.nextWeek.totalMeetings} meetings`,
      `✅ **Tasks:** ${data.tasks.completed.length} completed, ${data.tasks.inFlight.length} in progress`,
      data.tasks.overdue.length > 0 ? `⚠️ **Overdue:** ${data.tasks.overdue.length} tasks` : "",
      ``,
      `Click the link above to view the full report.`,
    ].filter(Boolean).join("\n");

    return summary;
  } catch (docError) {
    // Fallback — return text summary
    logger.error({ err: docError }, "Failed to create report doc");

    const lines = [
      "📊 **Weekly Activity Report**",
      "",
      `📅 **Last Week:** ${data.lastWeek.totalMeetings} meetings`,
    ];

    for (const ev of data.lastWeek.events) {
      lines.push(`  • ${formatDate(ev.startTime)}: ${ev.summary} (${formatDuration(ev.duration)})`);
    }

    lines.push("");
    lines.push(`🔮 **Next Week:** ${data.nextWeek.totalMeetings} meetings`);

    for (const ev of data.nextWeek.events) {
      lines.push(`  • ${formatDate(ev.startTime)}: ${ev.summary}`);
    }

    lines.push("");
    lines.push("✅ **Tasks:**");
    lines.push(`  • Completed: ${data.tasks.completed.length}`);
    lines.push(`  • In Progress: ${data.tasks.inFlight.length}`);
    if (data.tasks.overdue.length > 0) {
      lines.push(`  • ⚠️ Overdue: ${data.tasks.overdue.length}`);
      for (const t of data.tasks.overdue) {
        lines.push(`    - ${t.name}${t.dueDate ? ` (Due: ${formatDate(t.dueDate)})` : ""}`);
      }
    }

    return lines.join("\n");
  }
}
