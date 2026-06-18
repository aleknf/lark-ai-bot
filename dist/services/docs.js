"use strict";
// ============================================
// Lark Docs Service — create and update docs via lark-cli
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.docsService = void 0;
const lark_cli_1 = require("./lark-cli");
const utils_1 = require("../utils");
exports.docsService = {
    async createDoc(title, content) {
        utils_1.logger.debug({ title }, "Creating Lark Doc");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (0, lark_cli_1.execLarkCLIJSON)([
            "docs", "+create",
            "--content", content,
            "--as", "user",
        ]);
        // v2 response: { document: { document_id, url } } or user has { data: { document: ... } }
        const doc = result?.document || result?.data?.document || result;
        const docId = doc?.document_id || result?.document_id || result?.data?.document_id;
        const docUrl = doc?.url || result?.url || result?.data?.url || "";
        utils_1.logger.debug({ docId, docUrl, rawKeys: Object.keys(result || {}) }, "Doc created");
        return {
            document: {
                document_id: docId || "unknown",
                title: doc?.title || title,
                url: docUrl || `https://internal.larksuite.com/docs/${docId || "unknown"}`,
            },
        };
    },
    async appendContent(docToken, content) {
        utils_1.logger.debug({ docToken }, "Appending to Lark Doc");
        await (0, lark_cli_1.execLarkCLIJSON)([
            "docs", "+update",
            "--token", docToken,
            "--content", content,
            "--as", "user",
        ]);
    },
    async getDoc(docToken) {
        utils_1.logger.debug({ docToken }, "Fetching Lark Doc");
        return (0, lark_cli_1.execLarkCLIJSON)([
            "docs", "+fetch",
            "--token", docToken,
            "--as", "user",
        ]);
    },
};
//# sourceMappingURL=docs.js.map