// ============================================
// Lark AI Bot — Shared TypeScript Types
// ============================================

// --- Lark Webhook Event Types ---

export interface LarkEventHeader {
  event_id: string;
  event_type: string;
  create_time: string;
  token: string;
  app_id: string;
  tenant_key: string;
}

export interface LarkWebhookBody {
  schema?: string; // "2.0" for v2 events
  header?: LarkEventHeader;
  challenge?: string; // URL verification
  token?: string; // URL verification (v1)
  type?: string; // "url_verification" for v1
  event?: LarkEvent;
}

export interface LarkEvent {
  type?: string;
  sender?: LarkSender;
  message?: LarkMessage;
  // biome-ignore lint/suspicious/noExplicitAny: event data varies by type
  [key: string]: any;
}

export interface LarkSender {
  sender_id: {
    union_id: string;
    open_id: string;
    user_id: string;
  };
  sender_type: string;
  tenant_key: string;
}

export interface LarkMessage {
  message_id: string;
  root_id?: string;
  parent_id?: string;
  create_time: string;
  chat_id: string;
  chat_type: string;
  message_type: string;
  content: string; // JSON string, parsed to MessageContent
  mentions?: LarkMention[];
}

export interface LarkMention {
  key: string;
  id: {
    union_id: string;
    open_id: string;
    user_id: string;
  };
  name: string;
  tenant_key: string;
}

export interface MessageContent {
  text?: string;
  title?: string;
  content?: string[][];
  elements?: TextElement[];
}

export interface TextElement {
  tag: string;
  text?: string;
  [key: string]: unknown;
}

// --- Parsed Message (internal) ---

export interface ParsedMessage {
  messageId: string;
  chatId: string;
  chatType: string;
  senderOpenId: string;
  text: string;
  isMentioned: boolean;
  rootId?: string;
  parentId?: string;
  timestamp: number;
}

// --- OpenRouter Types ---

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface OpenRouterChoice {
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// --- Lark CLI Types ---

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CLIExecOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

// --- Bot Command Types ---

export type BotCommand =
  | { type: "help" }
  | { type: "search"; query: string }
  | { type: "report"; topic?: string }
  | { type: "sheet"; query: string }
  | { type: "ai"; prompt: string }
  | { type: "unknown"; raw: string };

// --- AI Pipeline Types ---

export interface PipelineContext {
  message: ParsedMessage;
  chatHistory: OpenRouterMessage[];
  baseData?: Record<string, unknown>[];
  sheetData?: unknown[][];
}

export interface PipelineResult {
  reply: string;
  actions?: PipelineAction[];
}

export interface PipelineAction {
  type: "base_write" | "sheet_write" | "doc_create" | "doc_append";
  params: Record<string, unknown>;
}

// --- Base Record Types ---

export interface BaseRecord {
  record_id: string;
  fields: Record<string, unknown>;
}

export interface BaseRecordListResult {
  items: BaseRecord[];
  has_more: boolean;
  page_token?: string;
  total?: number;
}

// --- Sheet Types ---

export interface SheetRangeData {
  majorDimension: "ROWS" | "COLUMNS";
  values: unknown[][];
  range: string;
}

// --- Doc Types ---

export interface DocCreateResult {
  document: {
    document_id: string;
    title: string;
    url: string;
  };
}