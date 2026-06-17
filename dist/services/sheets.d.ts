import type { SheetRangeData } from "../types";
export interface SheetsService {
    readRange(spreadsheetToken: string, range: string, sheetId?: string): Promise<SheetRangeData>;
    writeRange(spreadsheetToken: string, range: string, values: unknown[][], sheetId?: string): Promise<void>;
    readCell(spreadsheetToken: string, cell: string, sheetId?: string): Promise<unknown>;
}
export declare const sheetsService: SheetsService;
//# sourceMappingURL=sheets.d.ts.map