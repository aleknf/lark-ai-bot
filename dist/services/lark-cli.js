"use strict";
// ============================================
// Lark CLI Wrapper — subprocess executor for all lark-cli operations
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionDeniedError = void 0;
exports.execLarkCLI = execLarkCLI;
exports.execLarkCLIJSON = execLarkCLIJSON;
exports.sendMessage = sendMessage;
exports.initiateAuth = initiateAuth;
exports.completeAuth = completeAuth;
exports.fetchChatHistory = fetchChatHistory;
const node_child_process_1 = require("node:child_process");
const utils_1 = require("../utils");
const utils_2 = require("../utils");
const CLI_BIN = "lark-cli";
/**
 * Error thrown when a lark-cli command fails due to missing user permissions.
 * Catchers can use this to trigger the auth flow.
 */
class PermissionDeniedError extends Error {
    permission;
    constructor(permission) {
        const scopeList = permission.missingScopes.join(", ");
        super(`Permission denied for ${permission.service} (${permission.identity}): missing scopes [${scopeList}]`);
        this.name = "PermissionDeniedError";
        this.permission = permission;
    }
}
exports.PermissionDeniedError = PermissionDeniedError;
/**
 * Execute a lark-cli command and return raw result.
 */
function execLarkCLI(args, options) {
    const execOptions = {
        timeout: options?.timeout ?? 30_000,
        maxBuffer: 10 * 1024 * 1024, // 10MB
    };
    utils_1.logger.debug({ args }, "Executing lark-cli");
    return new Promise((resolve, reject) => {
        (0, node_child_process_1.execFile)(CLI_BIN, args, execOptions, (error, stdout, stderr) => {
            const outStr = String(stdout).trim();
            const errStr = String(stderr).trim();
            if (error) {
                // Exit code 10 = confirmation_required (high-risk write)
                if (error.code === "ERR_CHILD_PROCESS_TIMEOUT") {
                    reject(new Error(`lark-cli timed out after ${options?.timeout ?? 30000}ms`));
                    return;
                }
                resolve({
                    stdout: outStr,
                    stderr: errStr,
                    exitCode: error.code
                        ? parseInt(error.code, 10) || 1
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
async function execLarkCLIJSON(args, options) {
    const result = await execLarkCLI(args, options);
    if (result.exitCode !== 0) {
        // Parse structured error from stderr
        const errJson = (0, utils_2.safeJsonParse)(result.stderr, {});
        // Check for confirmation_required
        if (errJson.error?.type === "confirmation_required") {
            throw new Error(`High-risk operation requires confirmation: ${errJson.error.message}. Add --yes to confirm.`);
        }
        // Check for permission_denied / access_denied
        if (errJson.error?.type === "permission_denied" ||
            errJson.error?.type === "access_denied") {
            const identity = args.includes("--as") && args[args.indexOf("--as") + 1] === "bot"
                ? "bot"
                : "user";
            const service = args[0] || "unknown";
            throw new PermissionDeniedError({
                type: "permission_denied",
                service,
                identity: identity,
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
                identity: identity,
                missingScopes: [],
                consoleUrl: undefined,
            });
        }
        throw new Error(`lark-cli exited with code ${result.exitCode}: ${result.stderr || result.stdout}`);
    }
    if (!result.stdout) {
        return {};
    }
    const parsed = (0, utils_2.safeJsonParse)(result.stdout, null);
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
async function sendMessage(chatId, text, options) {
    const args = ["im"];
    const identity = options?.as ?? "bot";
    if (options?.replyToMessageId) {
        args.push("+messages-reply");
        args.push("--message-id", options.replyToMessageId);
    }
    else {
        args.push("+messages-send");
        args.push("--chat-id", chatId);
    }
    args.push("--as", identity, "--text", text);
    // Use JSON output to detect errors
    await execLarkCLIJSON(args);
}
/**
 * Initiate user authorization for missing scopes.
 * Returns a verification URL and device code — caller should present the URL
 * to the user and then call completeAuth() after the user confirms.
 */
async function initiateAuth(scopes) {
    const scopeArg = scopes.join(",");
    const result = await execLarkCLIJSON([
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
async function completeAuth(deviceCode) {
    await execLarkCLIJSON([
        "auth", "login",
        "--device-code", deviceCode,
    ]);
}
/**
 * Fetch recent chat messages for context.
 */
async function fetchChatHistory(chatId, limit = 20) {
    const args = [
        "im", "+chat-messages-list",
        "--chat-id", chatId,
        "--page-size", String(limit),
        "--as", "bot",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await execLarkCLIJSON(args);
    const items = result?.items || result?.data?.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((item) => ({
        messageId: item.message_id,
        senderId: item.sender?.id || item.sender_id,
        text: extractMessageText(item),
        timestamp: parseInt(item.create_time || "0", 10) * 1000,
    }));
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMessageText(item) {
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
//# sourceMappingURL=lark-cli.js.map