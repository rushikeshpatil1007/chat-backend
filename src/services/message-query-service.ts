import { ApiError } from "../errors/api-error";
import { isChatMember } from "../repositories/chat-repository";
import { getMessagePage, type MessagePage } from "../repositories/message-repository";

export async function getMessages(
  chatId: string,
  requesterId: string,
  limit: number,
  cursor?: string
): Promise<MessagePage> {
  const normalizedChatId = chatId.toLowerCase();
  const normalizedRequesterId = requesterId.toLowerCase();

  if (!(await isChatMember(normalizedChatId, normalizedRequesterId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return getMessagePage(normalizedChatId, limit, cursor);
}
