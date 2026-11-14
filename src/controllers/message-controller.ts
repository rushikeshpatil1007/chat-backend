import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { sendMessage as sendMessageService } from "../services/message-service";
import {
  idempotencyKeySchema,
  sendMessageBodySchema,
  sendMessageParamsSchema
} from "../validations/chat-validation";

export const sendMessage: RequestHandler = async (request, response, next) => {
  try {
    const { chatId } = sendMessageParamsSchema.parse(request.params);
    const body = sendMessageBodySchema.parse(request.body);
    const requesterId = request.authUserId;

    if (!requesterId) {
      throw new ApiError(401, "Authentication is required");
    }

    const rawIdempotencyKey = request.header("idempotency-key");
    const idempotencyKey = rawIdempotencyKey
      ? idempotencyKeySchema.parse(rawIdempotencyKey)
      : undefined;
    const result = await sendMessageService(
      chatId,
      requesterId,
      body.senderId,
      body.text,
      idempotencyKey
    );

    response.status(result.created ? 201 : 200).json({
      data: result.message,
      meta: { created: result.created }
    });
  } catch (error: unknown) {
    next(error);
  }
};
