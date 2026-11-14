import { ApiError } from "../errors/api-error";
import { isChatMember } from "../repositories/chat-repository";
import {
  saveReadReceipt,
  type SaveReadReceiptResult
} from "../repositories/read-receipt-repository";

export async function markMessageAsRead(
  chatId: string,
  messageId: string,
  authenticatedUserId: string,
  requestedUserId: string
): Promise<SaveReadReceiptResult> {
  const userId = authenticatedUserId.toLowerCase();
  if (requestedUserId.toLowerCase() !== userId) {
    throw new ApiError(403, "The user must match the authenticated account");
  }

  const normalizedChatId = chatId.toLowerCase();
  if (!(await isChatMember(normalizedChatId, userId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return saveReadReceipt(normalizedChatId, messageId, userId);
}
