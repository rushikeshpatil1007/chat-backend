import { ApiError } from "../errors/api-error";
import {
  findChatsForUser,
  findUsersByIds,
  type UserChatSummary
} from "../repositories/chat-repository";

export async function listUserChats(
  requestedUserId: string,
  authenticatedUserId: string
): Promise<UserChatSummary[]> {
  const userId = requestedUserId.toLowerCase();
  if (userId !== authenticatedUserId.toLowerCase()) {
    throw new ApiError(403, "You can only list chats for your own account");
  }

  const users = await findUsersByIds([userId]);
  if (users.length === 0) {
    throw new ApiError(404, "User was not found");
  }

  return findChatsForUser(userId);
}
