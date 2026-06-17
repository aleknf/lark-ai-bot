// ============================================
// Lark Sheets Service — cell/range read/write via lark-cli
// ============================================

import { execLarkCLIJSON } from "./lark-cli";
import { logger } from "../utils";
import type { SheetRangeData } from "../types";

export interface SheetsService {
  readRange(
    spreadsheetToken: string,
    range: string,
    sheetId?: string
  ): Promise<SheetRangeData>;

  writeRange(
    spreadsheetToken: string,
    range: string,
    values: unknown[][],
    sheetId?: string
  ): Promise<void>;

  readCell(
    spreadsheetToken: string,
    cell: string,
    sheetId?: string
  ): Promise<unknown>;
}

export const sheetsService: SheetsService = {
  async readRange(spreadsheetToken, range, sheetId) {
    logger.debug({ spreadsheetToken, range, sheetId }, "Reading Sheet range");

    const args = [
      "sheets", "+range-read",
      "--spreadsheet-token", spreadsheetToken,
      "--range", sheetId ? `${sheetId}!${range}` : range,
      "--as", "user",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await execLarkCLIJSON<any>(args);

    return {
      majorDimension: result.majorDimension || "ROWS",
      values: result.values || [],
      range: result.range || range,
    };
  },

  async writeRange(spreadsheetToken, range, values, sheetId) {
    logger.debug({ spreadsheetToken, range, rowCount: values.length }, "Writing Sheet range");

    await execLarkCLIJSON([
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
