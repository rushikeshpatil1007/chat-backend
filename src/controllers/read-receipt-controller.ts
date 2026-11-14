import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { markMessageAsRead } from "../services/read-receipt-service";
import {
  readReceiptBodySchema,
  readReceiptParamsSchema
} from "../validations/chat-validation";

export const markRead: RequestHandler = async (request, response, next) => {
  try {
    const { chatId, messageId } = readReceiptParamsSchema.parse(request.params);
    const { userId } = readReceiptBodySchema.parse(request.body);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const result = await markMessageAsRead(chatId, messageId, requesterId, userId);
    response.status(result.created ? 201 : 200).json({
      data: result.receipt,
      meta: { created: result.created }
    });
  } catch (error: unknown) {
    next(error);
  }
};
