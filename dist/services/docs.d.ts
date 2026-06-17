import type { DocCreateResult } from "../types";
export interface DocsService {
    createDoc(title: string, content: string): Promise<DocCreateResult>;
    appendContent(docToken: string, content: string): Promise<void>;
    getDoc(docToken: string): Promise<unknown>;
}
export declare const docsService: DocsService;
//# sourceMappingURL=docs.d.ts.map