import { ApiError } from "../errors/api-error";
import {
  addChatMembers,
  countExistingChatMembers,
  countChatAdmins,
  createGroupChat as persistGroupChat,
  findUsersByIds,
  getChatMemberRole,
  getChatMemberCount,
  removeChatMember
} from "../repositories/chat-repository";

const maximumGroupMembers = 100;

export async function createGroupChat(
  name: string,
  requestedMemberIds: string[],
  creatorId: string
) {
  const normalizedCreatorId = creatorId.toLowerCase();
  const normalizedRequestedIds = requestedMemberIds.map((id) => id.toLowerCase());
  const uniqueRequestedIds = [...new Set(normalizedRequestedIds)];

  if (uniqueRequestedIds.length !== normalizedRequestedIds.length) {
    throw new ApiError(400, "Group member IDs must be unique");
  }

  if (uniqueRequestedIds.includes(normalizedCreatorId)) {
    throw new ApiError(400, "Do not include the creator in memberIds; they are added automatically");
  }

  const memberIds = [normalizedCreatorId, ...uniqueRequestedIds].sort();
  if (memberIds.length < 3) {
    throw new ApiError(400, "A group chat requires at least two members besides the creator");
  }
  if (memberIds.length > maximumGroupMembers) {
    throw new ApiError(400, `A group chat can have at most ${maximumGroupMembers} members`);
  }

  const existingUsers = await findUsersByIds(memberIds);
  if (existingUsers.length !== memberIds.length) {
    throw new ApiError(404, "One or more users were not found");
  }

  return persistGroupChat(name, normalizedCreatorId, memberIds);
}

export async function addGroupMembers(
  chatId: string,
  requesterId: string,
  requestedMemberIds: string[]
): Promise<void> {
  const normalizedChatId = chatId.toLowerCase();
  const normalizedRequesterId = requesterId.toLowerCase();
  if ((await getChatMemberRole(normalizedChatId, normalizedRequesterId)) !== "ADMIN") {
    throw new ApiError(403, "Only a group admin can add members");
  }

  const memberIds = [...new Set(requestedMemberIds.map((id) => id.toLowerCase()))];
  if (memberIds.length !== requestedMemberIds.length) {
    throw new ApiError(400, "Group member IDs must be unique");
  }
  if (memberIds.includes(normalizedRequesterId)) {
    throw new ApiError(400, "You are already a member of this group");
  }

  const [currentCount, alreadyInChat] = await Promise.all([
    getChatMemberCount(normalizedChatId),
    countExistingChatMembers(normalizedChatId, memberIds)
  ]);
  if (alreadyInChat > 0) {
    throw new ApiError(409, "One or more users are already members of this group");
  }
  if (currentCount + memberIds.length - alreadyInChat > maximumGroupMembers) {
    throw new ApiError(400, `A group chat can have at most ${maximumGroupMembers} members`);
  }

  const existingUsers = await findUsersByIds(memberIds);
  if (existingUsers.length !== memberIds.length) {
    throw new ApiError(404, "One or more users were not found");
  }

  await addChatMembers(normalizedChatId, memberIds);
}

export async function removeGroupMember(
  chatId: string,
  requesterId: string,
  targetUserId: string
): Promise<void> {
  const normalizedChatId = chatId.toLowerCase();
  const normalizedRequesterId = requesterId.toLowerCase();
  const normalizedTargetId = targetUserId.toLowerCase();

  if ((await getChatMemberRole(normalizedChatId, normalizedRequesterId)) !== "ADMIN") {
    throw new ApiError(403, "Only a group admin can remove members");
  }

  const targetRole = await getChatMemberRole(normalizedChatId, normalizedTargetId);
  if (!targetRole) {
    throw new ApiError(404, "The user is not a member of this chat");
  }
  if (targetRole === "ADMIN" && (await countChatAdmins(normalizedChatId)) <= 1) {
    throw new ApiError(409, "A group must retain at least one admin");
  }

  await removeChatMember(normalizedChatId, normalizedTargetId);
}
