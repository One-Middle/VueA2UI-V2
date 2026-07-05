import type { A2UIServerMessage } from "@a2ui-platform/shared";

export interface ProcessMessagesResult {
  accepted: number;
}

export class MessageProcessor {
  processMessages(messages: A2UIServerMessage[]): ProcessMessagesResult {
    return { accepted: messages.length };
  }
}
