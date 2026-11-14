import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrGetChat: vi.fn(),
  sendMessage: vi.fn(),
  getMessages: vi.fn(),
  markMessageAsRead: vi.fn(),
  updateLastSeen: vi.fn(),
  listUserChats: vi.fn()
}));

vi.mock("../../src/lib/prisma", () => ({ prisma: {} }));
vi.mock("../../src/services/chat-service", () => ({ createOrGetChat: mocks.createOrGetChat }));
vi.mock("../../src/services/message-service", () => ({ sendMessage: mocks.sendMessage }));
vi.mock("../../src/services/message-query-service", () => ({ getMessages: mocks.getMessages }));
vi.mock("../../src/services/read-receipt-service", () => ({
  markMessageAsRead: mocks.markMessageAsRead
}));
vi.mock("../../src/services/last-seen-service", () => ({ updateLastSeen: mocks.updateLastSeen }));
vi.mock("../../src/services/user-chat-service", () => ({ listUserChats: mocks.listUserChats }));

import { app } from "../../src/app";

const jwtSecret = "test-only-secret-with-at-least-32-bytes";
const userAId = "10000000-0000-4000-8000-000000000001";
const userBId = "10000000-0000-4000-8000-000000000002";
const chatId = "20000000-0000-4000-8000-000000000001";
const token = jwt.sign({ sub: userAId }, jwtSecret, {
  algorithm: "HS256",
  expiresIn: "5m"
});

describe("chat API", () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
  });

  afterAll(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 401 when a protected route has no bearer token", async () => {
    const response = await request(app)
      .post("/chat/create")
      .send({ userAId, userBId });

    expect(response.status).toBe(401);
    expect(response.body.error.message).toBe("A bearer token is required");
  });

  it("rejects malformed request data before calling the service", async () => {
    const response = await request(app)
      .post("/chat/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ userAId, userBId, unexpected: true });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Request validation failed");
    expect(mocks.createOrGetChat).not.toHaveBeenCalled();
  });

  it("returns a newly created chat from the authenticated endpoint", async () => {
    mocks.createOrGetChat.mockResolvedValue({
      chatId,
      memberIds: [userAId, userBId],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      created: true
    });

    const response = await request(app)
      .post("/chat/create")
      .set("Authorization", `Bearer ${token}`)
      .send({ userAId, userBId });

    expect(response.status).toBe(201);
    expect(response.body.data.chatId).toBe(chatId);
    expect(mocks.createOrGetChat).toHaveBeenCalledWith(userAId, userBId, userAId);
  });

  it("validates pagination limits on the message endpoint", async () => {
    const response = await request(app)
      .get(`/chat/${chatId}/messages?limit=101`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Request validation failed");
    expect(mocks.getMessages).not.toHaveBeenCalled();
  });
});
