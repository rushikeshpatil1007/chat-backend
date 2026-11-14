import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { getMessages } from "../services/message-query-service";
import {
  getMessagesParamsSchema,
  getMessagesQuerySchema
} from "../validations/chat-validation";

export const listMessages: RequestHandler = async (request, response, next) => {
  try {
    const { chatId } = getMessagesParamsSchema.parse(request.params);
    const { limit, cursor } = getMessagesQuerySchema.parse(request.query);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const page = await getMessages(chatId, requesterId, limit, cursor);
    response.status(200).json({
      data: page.messages,
      pagination: {
        limit,
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      }
    });
  } catch (error: unknown) {
    next(error);
  }
};
