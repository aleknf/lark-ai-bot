// ============================================
// Lark Docs Service — create and update docs via lark-cli
// ============================================

import { execLarkCLIJSON } from "./lark-cli";
import { logger } from "../utils";
import type { DocCreateResult } from "../types";

export interface DocsService {
  createDoc(title: string, content: string): Promise<DocCreateResult>;
  appendContent(docToken: string, content: string): Promise<void>;
  getDoc(docToken: string): Promise<unknown>;
}

export const docsService: DocsService = {
  async createDoc(title, content) {
    logger.debug({ title }, "Creating Lark Doc");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await execLarkCLIJSON<any>([
      "docs", "+create",
      "--content", content,
      "--as", "user",
    ]);

    // v2 response: { document: { document_id, url } } or user has { data: { document: ... } }
    const doc = result?.document || result?.data?.document || result;
    const docId = doc?.document_id || result?.document_id || result?.data?.document_id;
    const docUrl = doc?.url || result?.url || result?.data?.url || "";

    logger.debug({ docId, docUrl, rawKeys: Object.keys(result || {}) }, "Doc created");

    return {
      document: {
        document_id: docId || "unknown",
        title: doc?.title || title,
        url: docUrl || `https://internal.larksuite.com/docs/${docId || "unknown"}`,
      },
    };
  },

  async appendContent(docToken, content) {
    logger.debug({ docToken }, "Appending to Lark Doc");

    await execLarkCLIJSON([
      "docs", "+update",
      "--token", docToken,
      "--content", content,
      "--as", "user",
    ]);
  },

  async getDoc(docToken) {
    logger.debug({ docToken }, "Fetching Lark Doc");

    return execLarkCLIJSON([
      "docs", "+fetch",
      "--token", docToken,
      "--as", "user",
    ]);
  },
};
