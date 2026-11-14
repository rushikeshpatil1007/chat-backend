import { ApiError } from "../errors/api-error";
import { isChatMember } from "../repositories/chat-repository";
import {
  advanceLastSeen,
  type UpdateLastSeenResult
} from "../repositories/last-seen-repository";

export async function updateLastSeen(
  chatId: string,
  authenticatedUserId: string,
  requestedUserId: string,
  messageId: string
): Promise<UpdateLastSeenResult> {
  const userId = authenticatedUserId.toLowerCase();
  if (requestedUserId.toLowerCase() !== userId) {
    throw new ApiError(403, "The user must match the authenticated account");
  }

  const normalizedChatId = chatId.toLowerCase();
  if (!(await isChatMember(normalizedChatId, userId))) {
    throw new ApiError(403, "You are not a member of this chat");
  }

  return advanceLastSeen(normalizedChatId, userId, messageId);
}
