import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { createOrGetChat } from "../services/chat-service";
import { createChatBodySchema } from "../validations/chat-validation";

export const createChat: RequestHandler = async (request, response, next) => {
  try {
    const body = createChatBodySchema.parse(request.body);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const result = await createOrGetChat(body.userAId, body.userBId, requesterId);
    const { created, ...chat } = result;

    response.status(created ? 201 : 200).json({
      data: chat,
      meta: { created }
    });
  } catch (error: unknown) {
    next(error);
  }
};
