import { Prisma } from "../generated/prisma/client";
import { ApiError } from "../errors/api-error";
import {
  createChatWithMembers,
  findChatByPairKey,
  findUsersByIds,
  type ChatSummary
} from "../repositories/chat-repository";

export interface CreateChatResult extends ChatSummary {
  created: boolean;
}

export async function createOrGetChat(
  userAId: string,
  userBId: string,
  requesterId: string
): Promise<CreateChatResult> {
  const memberIds = [userAId.toLowerCase(), userBId.toLowerCase()].sort();

  if (!memberIds.includes(requesterId.toLowerCase())) {
    throw new ApiError(403, "You can only create a chat that includes your account");
  }

  const existingUsers = await findUsersByIds(memberIds);
  if (existingUsers.length !== memberIds.length) {
    throw new ApiError(404, "One or more users were not found");
  }

  const pairKey = memberIds.join(":");
  const existingChat = await findChatByPairKey(pairKey);
  if (existingChat) {
    return { ...existingChat, created: false };
  }

  try {
    const chat = await createChatWithMembers(pairKey, memberIds);
    return { ...chat, created: true };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const chatCreatedByConcurrentRequest = await findChatByPairKey(pairKey);
      if (chatCreatedByConcurrentRequest) {
        return { ...chatCreatedByConcurrentRequest, created: false };
      }
    }

    throw error;
  }
}
