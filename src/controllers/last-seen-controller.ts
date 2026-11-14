import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { updateLastSeen } from "../services/last-seen-service";
import {
  lastSeenBodySchema,
  lastSeenParamsSchema
} from "../validations/chat-validation";

export const updateLastSeenController: RequestHandler = async (request, response, next) => {
  try {
    const { chatId } = lastSeenParamsSchema.parse(request.params);
    const { userId, messageId } = lastSeenBodySchema.parse(request.body);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const result = await updateLastSeen(chatId, requesterId, userId, messageId);
    response.status(200).json({
      data: result.marker,
      meta: { advanced: result.advanced }
    });
  } catch (error: unknown) {
    next(error);
  }
};
