import type { BotCommand, ParsedMessage } from "../types";
/**
 * Parse a user message into a BotCommand.
 * Recognizes slash commands and falls back to AI mode or unknown.
 */
export declare function parseCommand(message: ParsedMessage): BotCommand;
/**
 * Generate help text for the bot.
 */
export declare function getHelpText(): string;
//# sourceMappingURL=commands.d.ts.map