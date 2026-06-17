"use strict";
// ============================================
// Lark Base Service — record CRUD and data queries via lark-cli
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseService = void 0;
const lark_cli_1 = require("./lark-cli");
const utils_1 = require("../utils");
exports.baseService = {
    async searchRecords(baseToken, tableId, keyword, options) {
        utils_1.logger.debug({ baseToken, tableId, keyword }, "Searching Base records");
        const result = await (0, lark_cli_1.execLarkCLIJSON)([
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
        utils_1.logger.debug({ baseToken, tableId }, "Listing Base records");
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
        const result = await (0, lark_cli_1.execLarkCLIJSON)(args);
        return {
            items: (result.items || []).map(normalizeRecord),
            has_more: result.has_more ?? false,
            page_token: result.page_token,
            total: result.total,
        };
    },
    async getRecord(baseToken, tableId, recordId) {
        utils_1.logger.debug({ baseToken, tableId, recordId }, "Getting Base record");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (0, lark_cli_1.execLarkCLIJSON)([
            "base", "+record-get",
            "--base-token", baseToken,
            "--table-id", tableId,
            "--record-id", recordId,
            "--as", "user",
        ]);
        return normalizeRecord(result);
    },
    async upsertRecord(baseToken, tableId, data) {
        utils_1.logger.debug({ baseToken, tableId }, "Upserting Base record");
        await (0, lark_cli_1.execLarkCLIJSON)([
            "base", "+record-upsert",
            "--base-token", baseToken,
            "--table-id", tableId,
            "--data", JSON.stringify(data),
            "--as", "user",
        ]);
    },
    async dataQuery(baseToken, tableId, query) {
        utils_1.logger.debug({ baseToken, tableId }, "Running Base data query");
        const result = await (0, lark_cli_1.execLarkCLIJSON)([
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
function normalizeRecord(raw) {
    return {
        record_id: raw.record_id || raw.id,
        fields: raw.fields || {},
    };
}
//# sourceMappingURL=base.js.map