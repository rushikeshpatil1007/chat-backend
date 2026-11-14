import { ApiError } from "../errors/api-error";
import { isChatMember } from "../repositories/chat-repository";
import { storeMessage } from "../repositories/message-repository";

export async function sendMessage(
  chatId: string,
  authenticatedUserId: string,
  senderId: string,
  text: string,
  idempotencyKey?: string
) {
  const normalizedUserId = authenticatedUserId.toLowerCase();
  const normalizedSenderId = senderId.toLowerCase();

  if (normalizedSenderId !== normalizedUserId) {
    throw new ApiError(403, "The sender must match the authenticated user");
  }

  const normalizedChatId = chatId.toLowerCase();
  if (!(await isChatMember(normalizedChatId, normalizedUserId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return storeMessage(normalizedChatId, normalizedUserId, text, idempotencyKey);
}
