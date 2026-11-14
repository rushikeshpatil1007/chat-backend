import type { RequestHandler } from "express";
import { ApiError } from "../errors/api-error";
import {
  addGroupMembers,
  createGroupChat,
  removeGroupMember
} from "../services/group-chat-service";
import {
  createGroupChatBodySchema,
  groupChatParamsSchema,
  groupMemberParamsSchema,
  groupMembersBodySchema
} from "../validations/chat-validation";

export const createGroupChatController: RequestHandler = async (request, response, next) => {
  try {
    const body = createGroupChatBodySchema.parse(request.body);
    const requesterId = request.authUserId;
    if (!requesterId) throw new ApiError(401, "Authentication is required");

    const chat = await createGroupChat(body.name, body.memberIds, requesterId);
    response.status(201).json({ data: chat });
  } catch (error: unknown) {
    next(error);
  }
};

export const addGroupMembersController: RequestHandler = async (request, response, next) => {
  try {
    const { chatId } = groupChatParamsSchema.parse(request.params);
    const { userIds } = groupMembersBodySchema.parse(request.body);
    const requesterId = request.authUserId;
    if (!requesterId) throw new ApiError(401, "Authentication is required");

    await addGroupMembers(chatId, requesterId, userIds);
    response.status(200).json({ data: { chatId, addedUserIds: userIds } });
  } catch (error: unknown) {
    next(error);
  }
};

export const removeGroupMemberController: RequestHandler = async (request, response, next) => {
  try {
    const { chatId, userId } = groupMemberParamsSchema.parse(request.params);
    const requesterId = request.authUserId;
    if (!requesterId) throw new ApiError(401, "Authentication is required");

    await removeGroupMember(chatId, requesterId, userId);
    response.status(200).json({ data: { chatId, removedUserId: userId } });
  } catch (error: unknown) {
    next(error);
  }
};
