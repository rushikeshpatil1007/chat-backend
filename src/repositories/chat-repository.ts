import { prisma } from "../lib/prisma";

export interface ChatSummary {
  chatId: string;
  memberIds: string[];
  createdAt: Date;
  name?: string | null;
}

export interface UserChatSummary {
  chatId: string;
  memberIds: string[];
  name?: string | null;
}

export async function findUsersByIds(userIds: string[]): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true }
  });

  return users.map((user) => user.id.toLowerCase());
}

export async function isChatMember(chatId: string, userId: string): Promise<boolean> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { chatId: true }
  });

  return membership !== null;
}

export async function findChatByPairKey(pairKey: string): Promise<ChatSummary | null> {
  const chat = await prisma.chat.findUnique({
    where: { pairKey },
    include: { members: { select: { userId: true } } }
  });

  if (!chat) {
    return null;
  }

  return {
    chatId: chat.id,
    memberIds: chat.members.map((member) => member.userId),
    createdAt: chat.createdAt,
    name: chat.name
  };
}

export async function createChatWithMembers(
  pairKey: string,
  memberIds: string[]
): Promise<ChatSummary> {
  return prisma.$transaction(async (transaction) => {
    const chat = await transaction.chat.create({ data: { pairKey } });
    await transaction.chatMember.createMany({
      data: memberIds.map((userId) => ({ chatId: chat.id, userId }))
    });

    return {
      chatId: chat.id,
      memberIds,
      createdAt: chat.createdAt
    };
  });
}

export async function createGroupChat(
  name: string,
  creatorId: string,
  memberIds: string[]
): Promise<ChatSummary> {
  return prisma.$transaction(async (transaction) => {
    const chat = await transaction.chat.create({ data: { name } });
    await transaction.chatMember.createMany({
      data: memberIds.map((userId) => ({
        chatId: chat.id,
        userId,
        role: userId === creatorId ? "ADMIN" : "MEMBER"
      }))
    });

    return {
      chatId: chat.id,
      memberIds,
      createdAt: chat.createdAt,
      name: chat.name
    };
  });
}

export async function getChatMemberRole(
  chatId: string,
  userId: string
): Promise<"ADMIN" | "MEMBER" | null> {
  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId } },
    select: { role: true }
  });

  return membership?.role ?? null;
}

export async function addChatMembers(chatId: string, userIds: string[]): Promise<void> {
  await prisma.chatMember.createMany({
    data: userIds.map((userId) => ({ chatId, userId })),
    skipDuplicates: true
  });
}

export async function countExistingChatMembers(chatId: string, userIds: string[]): Promise<number> {
  return prisma.chatMember.count({
    where: { chatId, userId: { in: userIds } }
  });
}

export async function getChatMemberCount(chatId: string): Promise<number> {
  return prisma.chatMember.count({ where: { chatId } });
}

export async function removeChatMember(chatId: string, userId: string): Promise<boolean> {
  const result = await prisma.chatMember.deleteMany({ where: { chatId, userId } });
  return result.count > 0;
}

export async function countChatAdmins(chatId: string): Promise<number> {
  return prisma.chatMember.count({ where: { chatId, role: "ADMIN" } });
}

export async function findChatsForUser(userId: string): Promise<UserChatSummary[]> {
  const chats = await prisma.chat.findMany({
    where: { members: { some: { userId } } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      members: { select: { userId: true } }
    }
  });

  return chats.map((chat) => ({
    chatId: chat.id,
    memberIds: chat.members.map((member) => member.userId),
    name: chat.name
  }));
}
