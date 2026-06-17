"use strict";
// ============================================
// Lark Sheets Service — cell/range read/write via lark-cli
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.sheetsService = void 0;
const lark_cli_1 = require("./lark-cli");
const utils_1 = require("../utils");
exports.sheetsService = {
    async readRange(spreadsheetToken, range, sheetId) {
        utils_1.logger.debug({ spreadsheetToken, range, sheetId }, "Reading Sheet range");
        const args = [
            "sheets", "+range-read",
            "--spreadsheet-token", spreadsheetToken,
            "--range", sheetId ? `${sheetId}!${range}` : range,
            "--as", "user",
        ];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (0, lark_cli_1.execLarkCLIJSON)(args);
        return {
            majorDimension: result.majorDimension || "ROWS",
            values: result.values || [],
            range: result.range || range,
        };
    },
    async writeRange(spreadsheetToken, range, values, sheetId) {
        utils_1.logger.debug({ spreadsheetToken, range, rowCount: values.length }, "Writing Sheet range");
        await (0, lark_cli_1.execLarkCLIJSON)([
            "sheets", "+range-write",
            "--spreadsheet-token", spreadsheetToken,
            "--range", sheetId ? `${sheetId}!${range}` : range,
            "--data", JSON.stringify(values),
            "--as", "user",
        ]);
    },
    async readCell(spreadsheetToken, cell, sheetId) {
        const range = sheetId ? `${sheetId}!${cell}` : cell;
        const data = await this.readRange(spreadsheetToken, range);
        return data.values?.[0]?.[0] ?? null;
    },
};
//# sourceMappingURL=sheets.js.map