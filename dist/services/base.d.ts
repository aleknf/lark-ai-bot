import type { BaseRecord, BaseRecordListResult } from "../types";
export interface BaseService {
    searchRecords(baseToken: string, tableId: string, keyword: string, options?: {
        limit?: number;
    }): Promise<BaseRecord[]>;
    listRecords(baseToken: string, tableId: string, options?: {
        limit?: number;
        pageToken?: string;
    }): Promise<BaseRecordListResult>;
    getRecord(baseToken: string, tableId: string, recordId: string): Promise<BaseRecord>;
    upsertRecord(baseToken: string, tableId: string, data: Record<string, unknown>): Promise<void>;
    dataQuery(baseToken: string, tableId: string, query: string): Promise<unknown>;
}
export declare const baseService: BaseService;
//# sourceMappingURL=base.d.ts.map