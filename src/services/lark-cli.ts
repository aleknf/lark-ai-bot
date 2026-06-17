// ============================================
// Lark CLI Wrapper — subprocess executor for all lark-cli operations
// ============================================

import { execFile, type ExecFileOptions } from "node:child_process";
import { logger } from "../utils";
import { safeJsonParse } from "../utils";
import type { CLIResult } from "../types";

const CLI_BIN = "lark-cli";

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
    // Check for confirmation_required
    const error = safeJsonParse<{ error?: { type?: string; hint?: string; message?: string } }>(
      result.stderr,
      {}
    );
    if (error.error?.type === "confirmation_required") {
      throw new Error(
        `High-risk operation requires confirmation: ${error.error.message}. Add --yes to confirm.`
      );
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

// ============================================
// High-level CLI operations
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
  } else {
    args.push("+messages-send");
    args.push("--chat-id", chatId);
  }

  args.push("--as", identity, "--text", text);

  // Use JSON output to detect errors
  await execLarkCLIJSON(args);
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
    "--limit", String(limit),
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
