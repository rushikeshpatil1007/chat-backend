import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import { deleteMessage, editMessage } from "../services/message-service";
import {
  editMessageBodySchema,
  messageMutationParamsSchema
} from "../validations/chat-validation";

export const editMessageController: RequestHandler = async (request, response, next) => {
  try {
    const { chatId, messageId } = messageMutationParamsSchema.parse(request.params);
    const { text } = editMessageBodySchema.parse(request.body);
    const requesterId = request.authUserId;
    if (!requesterId) throw new ApiError(401, "Authentication is required");

    const message = await editMessage(chatId, requesterId, messageId, text);
    response.status(200).json({ data: message });
  } catch (error: unknown) {
    next(error);
  }
};

export const deleteMessageController: RequestHandler = async (request, response, next) => {
  try {
    const { chatId, messageId } = messageMutationParamsSchema.parse(request.params);
    const requesterId = request.authUserId;
    if (!requesterId) throw new ApiError(401, "Authentication is required");

    const message = await deleteMessage(chatId, requesterId, messageId);
    response.status(200).json({ data: message });
  } catch (error: unknown) {
    next(error);
  }
};
