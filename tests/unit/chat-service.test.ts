import { beforeEach, describe, expect, it, vi } from "vitest";
import * as chatRepository from "../../src/repositories/chat-repository";
import { createOrGetChat } from "../../src/services/chat-service";

vi.mock("../../src/repositories/chat-repository", () => ({
  createChatWithMembers: vi.fn(),
  findChatByPairKey: vi.fn(),
  findUsersByIds: vi.fn(),
  isChatMember: vi.fn(),
  findChatsForUser: vi.fn()
}));

const userAId = "10000000-0000-4000-8000-000000000001";
const userBId = "10000000-0000-4000-8000-000000000002";
const chat = {
  chatId: "20000000-0000-4000-8000-000000000001",
  memberIds: [userAId, userBId],
  createdAt: new Date("2026-01-01T00:00:00.000Z")
};

describe("createOrGetChat", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(chatRepository.findUsersByIds).mockResolvedValue([userAId, userBId]);
    vi.mocked(chatRepository.findChatByPairKey).mockResolvedValue(null);
  });

  it("creates a chat and both memberships for a valid participant pair", async () => {
    vi.mocked(chatRepository.createChatWithMembers).mockResolvedValue(chat);

    const result = await createOrGetChat(userBId, userAId, userAId);

    expect(chatRepository.createChatWithMembers).toHaveBeenCalledWith(
      `${userAId}:${userBId}`,
      [userAId, userBId]
    );
    expect(result).toEqual({ ...chat, created: true });
  });

  it("returns an existing chat instead of creating a duplicate", async () => {
    vi.mocked(chatRepository.findChatByPairKey).mockResolvedValue(chat);

    const result = await createOrGetChat(userAId, userBId, userBId);

    expect(chatRepository.createChatWithMembers).not.toHaveBeenCalled();
    expect(result).toEqual({ ...chat, created: false });
  });

  it("rejects a request when the caller is not a participant", async () => {
    await expect(createOrGetChat(userAId, userBId, "30000000-0000-4000-8000-000000000001"))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(chatRepository.findUsersByIds).not.toHaveBeenCalled();
  });

  it("rejects pairs containing a missing user", async () => {
    vi.mocked(chatRepository.findUsersByIds).mockResolvedValue([userAId]);

    await expect(createOrGetChat(userAId, userBId, userAId))
      .rejects.toMatchObject({ statusCode: 404 });
    expect(chatRepository.createChatWithMembers).not.toHaveBeenCalled();
  });
});
