// ============================================
// Lark Base Service — record CRUD and data queries via lark-cli
// ============================================

import { execLarkCLIJSON } from "./lark-cli";
import { logger } from "../utils";
import type { BaseRecord, BaseRecordListResult } from "../types";

export interface BaseService {
  searchRecords(
    baseToken: string,
    tableId: string,
    keyword: string,
    options?: { limit?: number }
  ): Promise<BaseRecord[]>;

  listRecords(
    baseToken: string,
    tableId: string,
    options?: { limit?: number; pageToken?: string }
  ): Promise<BaseRecordListResult>;

  getRecord(
    baseToken: string,
    tableId: string,
    recordId: string
  ): Promise<BaseRecord>;

  upsertRecord(
    baseToken: string,
    tableId: string,
    data: Record<string, unknown>
  ): Promise<void>;

  dataQuery(
    baseToken: string,
    tableId: string,
    query: string
  ): Promise<unknown>;
}

export const baseService: BaseService = {
  async searchRecords(baseToken, tableId, keyword, options) {
    logger.debug({ baseToken, tableId, keyword }, "Searching Base records");

    const result = await execLarkCLIJSON<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items?: any[];
      has_more?: boolean;
    }>([
      "base", "+record-search",
      "--base-token", baseToken,
      "--table-id", tableId,
      "--keyword", keyword,
      "--limit", String(options?.limit ?? 20),
      "--as", "user",
    ]);

    return (result.items || []).map(normalizeRecord);
  },

  async listRecords(baseToken, tableId, options) {
    logger.debug({ baseToken, tableId }, "Listing Base records");

    const args = [
      "base", "+record-list",
      "--base-token", baseToken,
      "--table-id", tableId,
      "--as", "user",
      "--limit", String(options?.limit ?? 100),
    ];

    if (options?.pageToken) {
      args.push("--page-token", options.pageToken);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await execLarkCLIJSON<any>(args);

    return {
      items: (result.items || []).map(normalizeRecord),
      has_more: result.has_more ?? false,
      page_token: result.page_token,
      total: result.total,
    };
  },

  async getRecord(baseToken, tableId, recordId) {
    logger.debug({ baseToken, tableId, recordId }, "Getting Base record");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await execLarkCLIJSON<any>([
      "base", "+record-get",
      "--base-token", baseToken,
      "--table-id", tableId,
      "--record-id", recordId,
      "--as", "user",
    ]);

    return normalizeRecord(result);
  },

  async upsertRecord(baseToken, tableId, data) {
    logger.debug({ baseToken, tableId }, "Upserting Base record");

    await execLarkCLIJSON([
      "base", "+record-upsert",
      "--base-token", baseToken,
      "--table-id", tableId,
      "--data", JSON.stringify(data),
      "--as", "user",
    ]);
  },

  async dataQuery(baseToken, tableId, query) {
    logger.debug({ baseToken, tableId }, "Running Base data query");

    const result = await execLarkCLIJSON([
      "base", "+data-query",
      "--base-token", baseToken,
      "--table-id", tableId,
      "--query", query,
      "--as", "user",
    ]);

    return result;
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeRecord(raw: any): BaseRecord {
  return {
    record_id: raw.record_id || raw.id,
    fields: raw.fields || {},
  };
}
