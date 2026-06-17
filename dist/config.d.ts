import { z } from "zod";
declare const configSchema: z.ZodObject<{
    PORT: z.ZodDefault<z.ZodNumber>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
    OPENROUTER_API_KEY: z.ZodString;
    OPENROUTER_MODEL: z.ZodDefault<z.ZodString>;
    OPENROUTER_APP_NAME: z.ZodOptional<z.ZodString>;
    OPENROUTER_APP_URL: z.ZodOptional<z.ZodString>;
    LARK_APP_ID: z.ZodString;
    LARK_APP_SECRET: z.ZodString;
    LARK_VERIFICATION_TOKEN: z.ZodOptional<z.ZodString>;
    LARK_DEFAULT_BASE_TOKEN: z.ZodOptional<z.ZodString>;
    LARK_DEFAULT_SHEET_TOKEN: z.ZodOptional<z.ZodString>;
    AI_MAX_CONTEXT_MESSAGES: z.ZodDefault<z.ZodNumber>;
    AI_SYSTEM_PROMPT: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    PORT: number;
    NODE_ENV: "development" | "production" | "test";
    OPENROUTER_API_KEY: string;
    OPENROUTER_MODEL: string;
    LARK_APP_ID: string;
    LARK_APP_SECRET: string;
    AI_MAX_CONTEXT_MESSAGES: number;
    AI_SYSTEM_PROMPT: string;
    OPENROUTER_APP_NAME?: string | undefined;
    OPENROUTER_APP_URL?: string | undefined;
    LARK_VERIFICATION_TOKEN?: string | undefined;
    LARK_DEFAULT_BASE_TOKEN?: string | undefined;
    LARK_DEFAULT_SHEET_TOKEN?: string | undefined;
}, {
    OPENROUTER_API_KEY: string;
    LARK_APP_ID: string;
    LARK_APP_SECRET: string;
    PORT?: number | undefined;
    NODE_ENV?: "development" | "production" | "test" | undefined;
    OPENROUTER_MODEL?: string | undefined;
    OPENROUTER_APP_NAME?: string | undefined;
    OPENROUTER_APP_URL?: string | undefined;
    LARK_VERIFICATION_TOKEN?: string | undefined;
    LARK_DEFAULT_BASE_TOKEN?: string | undefined;
    LARK_DEFAULT_SHEET_TOKEN?: string | undefined;
    AI_MAX_CONTEXT_MESSAGES?: number | undefined;
    AI_SYSTEM_PROMPT?: string | undefined;
}>;
export type Config = z.infer<typeof configSchema>;
export declare function getConfig(): Config;
export declare function reloadConfig(): Config;
export {};
//# sourceMappingURL=config.d.ts.map