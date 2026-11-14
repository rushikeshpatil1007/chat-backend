import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { listUserChats } from "../services/user-chat-service";
import { userChatsParamsSchema } from "../validations/chat-validation";

export const listUserChatsController: RequestHandler = async (request, response, next) => {
  try {
    const { userId } = userChatsParamsSchema.parse(request.params);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const chats = await listUserChats(userId, requesterId);
    response.status(200).json({ data: chats });
  } catch (error: unknown) {
    next(error);
  }
};
