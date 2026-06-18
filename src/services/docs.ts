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
      "--title", title,
      "--content", content,
      "--as", "user",
    ]);

    return {
      document: {
        document_id: result.document?.document_id || result.doc_token,
        title: result.document?.title || title,
        url: result.document?.url || "",
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
