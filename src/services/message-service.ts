import { ApiError } from "../errors/api-error";
import { isChatMember } from "../repositories/chat-repository";
import {
  deleteStoredMessage,
  editStoredMessage,
  storeMessage
} from "../repositories/message-repository";

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

export async function editMessage(
  chatId: string,
  authenticatedUserId: string,
  messageId: string,
  text: string
) {
  const userId = authenticatedUserId.toLowerCase();
  const normalizedChatId = chatId.toLowerCase();
  if (!(await isChatMember(normalizedChatId, userId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return editStoredMessage(normalizedChatId, messageId, userId, text);
}

export async function deleteMessage(
  chatId: string,
  authenticatedUserId: string,
  messageId: string
) {
  const userId = authenticatedUserId.toLowerCase();
  const normalizedChatId = chatId.toLowerCase();
  if (!(await isChatMember(normalizedChatId, userId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return deleteStoredMessage(normalizedChatId, messageId, userId);
}
