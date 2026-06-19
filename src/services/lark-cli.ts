// ============================================
// Lark CLI Wrapper — subprocess executor for all lark-cli operations
// Supports all lark-cli domains: im, base, sheets, docs, calendar, contact,
// drive, task, approval, attendance, okr, mail, markdown, minutes, vc, whiteboard, wiki, event
// ============================================

import { execFile, type ExecFileOptions } from "node:child_process";
import { logger } from "../utils";
import { safeJsonParse } from "../utils";
import type { CLIResult, PermissionDenied, AuthInitiateResult } from "../types";

const CLI_BIN = "lark-cli";

// Available lark-cli domains
export const LARK_DOMAINS = [
  "im", "base", "sheets", "docs", "calendar", "contact",
  "drive", "task", "approval", "attendance", "okr",
  "mail", "markdown", "minutes", "vc", "whiteboard", "wiki", "event"
] as const;

export type LarkDomain = typeof LARK_DOMAINS[number];

/**
 * Error thrown when a lark-cli command fails due to missing user permissions.
 * Catchers can use this to trigger the auth flow.
 */
export class PermissionDeniedError extends Error {
  public readonly permission: PermissionDenied;

  constructor(permission: PermissionDenied) {
    const scopeList = permission.missingScopes.join(", ");
    super(
      `Permission denied for ${permission.service} (${permission.identity}): missing scopes [${scopeList}]`
    );
    this.name = "PermissionDeniedError";
    this.permission = permission;
  }
}

/**
 * Execute a lark-cli command and return raw result.
 */
export function execLarkCLI(
  args: string[],
  options?: { timeout?: number }
): Promise<CLIResult> {
  const execOptions: ExecFileOptions = {
    timeout: options?.timeout ?? 30_000,
    maxBuffer: 10 * 1024 * 1024, // 10MB
  };

  logger.debug({ args }, "Executing lark-cli");

  return new Promise((resolve, reject) => {
    execFile(CLI_BIN, args, execOptions, (error, stdout, stderr) => {
      const outStr = String(stdout).trim();
      const errStr = String(stderr).trim();

      if (error) {
        // Exit code 10 = confirmation_required (high-risk write)
        if ((error as NodeJS.ErrnoException).code === "ERR_CHILD_PROCESS_TIMEOUT") {
          reject(new Error(`lark-cli timed out after ${options?.timeout ?? 30000}ms`));
          return;
        }

        resolve({
          stdout: outStr,
          stderr: errStr,
          exitCode: (error as NodeJS.ErrnoException).code
            ? parseInt((error as NodeJS.ErrnoException).code!, 10) || 1
            : 1,
        });
        return;
      }

      resolve({
        stdout: outStr,
        stderr: errStr,
        exitCode: 0,
      });
    });
  });
}

/**
 * Execute a lark-cli command and parse stdout as JSON.
 */
export async function execLarkCLIJSON<T>(
  args: string[],
  options?: { timeout?: number }
): Promise<T> {
  const result = await execLarkCLI(args, options);

  if (result.exitCode !== 0) {
    // Parse structured error from stderr
    const errJson = safeJsonParse<{
      error?: {
        type?: string;
        hint?: string;
        message?: string;
        permission_violations?: string[];
        role?: string;
        scope?: string;
      };
    }>(result.stderr, {});

    // Check for confirmation_required
    if (errJson.error?.type === "confirmation_required") {
      throw new Error(
        `High-risk operation requires confirmation: ${errJson.error.message}. Add --yes to confirm.`
      );
    }

    // Check for permission_denied / access_denied
    if (
      errJson.error?.type === "permission_denied" ||
      errJson.error?.type === "access_denied"
    ) {
      const identity = args.includes("--as") && args[args.indexOf("--as") + 1] === "bot"
        ? "bot"
        : "user";
      const service = args[0] || "unknown";

      throw new PermissionDeniedError({
        type: "permission_denied",
        service,
        identity: identity as "user" | "bot",
        missingScopes: errJson.error.permission_violations || [],
        consoleUrl: undefined, // populated by caller if needed
      });
    }

    // Generic permission check: look for "no permission" or "access denied" in message
    const rawErr = (result.stderr || result.stdout).toLowerCase();
    if (rawErr.includes("no permission") || rawErr.includes("access_denied")) {
      const service = args[0] || "unknown";
      const identity = args.includes("--as") && args[args.indexOf("--as") + 1] === "bot"
        ? "bot"
        : "user";

      throw new PermissionDeniedError({
        type: "permission_denied",
        service,
        identity: identity as "user" | "bot",
        missingScopes: [],
        consoleUrl: undefined,
      });
    }

    throw new Error(
      `lark-cli exited with code ${result.exitCode}: ${result.stderr || result.stdout}`
    );
  }

  if (!result.stdout) {
    return {} as T;
  }

  const parsed = safeJsonParse<T>(result.stdout, null as unknown as T);
  if (parsed === null) {
    throw new Error(`Failed to parse lark-cli JSON output: ${result.stdout.slice(0, 200)}`);
  }

  return parsed;
}

/**
 * Generic lark-cli command executor.
 * This allows the AI to execute any lark-cli command dynamically.
 * 
 * @example
 * // Calendar
 * await execLarkCommand("calendar", ["+agenda", "--start", "2024-01-01T00:00:00+08:00", "--end", "2024-01-07T23:59:59+08:00"])
 * 
 * // Tasks
 * await execLarkCommand("task", ["+get-my-tasks", "--as", "user"])
 * 
 * // Contact search
 * await execLarkCommand("contact", ["+search-user", "--query", "John"])
 */
export async function execLarkCommand(
  domain: string,
  args: string[],
  options?: { timeout?: number; as?: "bot" | "user" }
): Promise<unknown> {
  const fullArgs = [domain, ...args];
  
  // Add identity flag if specified
  if (options?.as && !args.includes("--as")) {
    fullArgs.push("--as", options.as);
  }

  return await execLarkCLIJSON(fullArgs, options);
}

// ============================================
// High-level CLI operations (backward compatibility)
// ============================================

/**
 * Send a text message to a chat.
 */
export async function sendMessage(
  chatId: string,
  text: string,
  options?: { replyToMessageId?: string; as?: "bot" | "user" }
): Promise<void> {
  const args = ["im"];
  const identity = options?.as ?? "bot";

  if (options?.replyToMessageId) {
    args.push("+messages-reply");
    args.push("--message-id", options.replyToMessageId);
    logger.info({ messageId: options.replyToMessageId, textLength: text.length }, "Replying to message via lark-cli");
  } else {
    args.push("+messages-send");
    args.push("--chat-id", chatId);
    logger.info({ chatId, textLength: text.length }, "Sending message via lark-cli");
  }

  args.push("--as", identity, "--text", text);

  logger.debug({ args: args.join(" ") }, "Full lark-cli command");

  // Use JSON output to detect errors
  try {
    const result = await execLarkCLIJSON(args);
    logger.info({ result }, "Message sent successfully");
  } catch (error) {
    logger.error({ err: error, args }, "Failed to send message via lark-cli");
    throw error;
  }
}

/**
 * Initiate user authorization for missing scopes.
 * Returns a verification URL and device code — caller should present the URL
 * to the user and then call completeAuth() after the user confirms.
 */
export async function initiateAuth(scopes: string[]): Promise<AuthInitiateResult> {
  const scopeArg = scopes.join(",");
  const result = await execLarkCLIJSON<{
    device_code: string;
    verification_url: string;
    expires_in: number;
  }>([
    "auth", "login",
    "--scope", scopeArg,
    "--no-wait",
  ]);

  return {
    verificationUrl: result.verification_url,
    deviceCode: result.device_code,
    expiresIn: result.expires_in,
  };
}

/**
 * Complete authorization after user has authorized in browser.
 */
export async function completeAuth(deviceCode: string): Promise<void> {
  await execLarkCLIJSON([
    "auth", "login",
    "--device-code", deviceCode,
  ]);
}

/**
 * Fetch recent chat messages for context.
 */
export async function fetchChatHistory(
  chatId: string,
  limit: number = 20
): Promise<{ messageId: string; senderId: string; text: string; timestamp: number }[]> {
  const args = [
    "im", "+chat-messages-list",
    "--chat-id", chatId,
    "--page-size", String(limit),
    "--as", "bot",
  ];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await execLarkCLIJSON<any>(args);

  const items = result?.items || result?.data?.items || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((item: any) => ({
    messageId: item.message_id,
    senderId: item.sender?.id || item.sender_id,
    text: extractMessageText(item),
    timestamp: parseInt(item.create_time || "0", 10) * 1000,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessageText(item: any): string {
  if (!item.body?.content) return "";
  try {
    const content = typeof item.body.content === "string"
      ? JSON.parse(item.body.content)
      : item.body.content;
    if (content.text) return content.text;
    if (content.content) {
      const texts: string[] = [];
      for (const block of content.content) {
        if (Array.isArray(block)) {
          for (const el of block) {
            if (el.tag === "text" && el.text) texts.push(el.text);
          }
        }
      }
      return texts.join("");
    }
    return "";
  } catch {
    return item.body.content || "";
  }
}
