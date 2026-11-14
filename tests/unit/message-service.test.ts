import { beforeEach, describe, expect, it, vi } from "vitest";
import * as chatRepository from "../../src/repositories/chat-repository";
import * as messageRepository from "../../src/repositories/message-repository";
import { sendMessage } from "../../src/services/message-service";

vi.mock("../../src/repositories/chat-repository", () => ({
  isChatMember: vi.fn(),
  createChatWithMembers: vi.fn(),
  findChatByPairKey: vi.fn(),
  findUsersByIds: vi.fn(),
  findChatsForUser: vi.fn()
}));

vi.mock("../../src/repositories/message-repository", () => ({
  storeMessage: vi.fn(),
  getMessagePage: vi.fn()
}));

const userId = "10000000-0000-4000-8000-000000000001";
const chatId = "20000000-0000-4000-8000-000000000001";
const storedMessage = {
  message: {
    messageId: "message-1",
    senderId: userId,
    text: "Hello",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  created: true
};

describe("sendMessage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(chatRepository.isChatMember).mockResolvedValue(true);
    vi.mocked(messageRepository.storeMessage).mockResolvedValue(storedMessage);
  });

  it("checks membership and passes an idempotency key to persistence", async () => {
    const result = await sendMessage(chatId, userId, userId, "Hello", "request-1");

    expect(chatRepository.isChatMember).toHaveBeenCalledWith(chatId, userId);
    expect(messageRepository.storeMessage).toHaveBeenCalledWith(chatId, userId, "Hello", "request-1");
    expect(result).toEqual(storedMessage);
  });

  it("rejects a sender ID that differs from the authenticated identity", async () => {
    await expect(sendMessage(chatId, userId, "30000000-0000-4000-8000-000000000001", "Hello"))
      .rejects.toMatchObject({ statusCode: 403 });

    expect(chatRepository.isChatMember).not.toHaveBeenCalled();
    expect(messageRepository.storeMessage).not.toHaveBeenCalled();
  });

  it("does not store a message for a non-member", async () => {
    vi.mocked(chatRepository.isChatMember).mockResolvedValue(false);

    await expect(sendMessage(chatId, userId, userId, "Hello"))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(messageRepository.storeMessage).not.toHaveBeenCalled();
  });
});
