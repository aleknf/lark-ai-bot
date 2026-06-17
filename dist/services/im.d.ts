export interface IMService {
    sendText(chatId: string, text: string, options?: {
        replyToMessageId?: string;
    }): Promise<void>;
    reply(messageId: string, text: string): Promise<void>;
    getChatHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
    sendCard(chatId: string, cardJson: Record<string, unknown>): Promise<void>;
}
export interface ChatMessage {
    messageId: string;
    senderId: string;
    text: string;
    timestamp: number;
    isBot: boolean;
}
/**
 * Lark IM operations via lark-cli.
 */
export declare const imService: IMService;
//# sourceMappingURL=im.d.ts.map