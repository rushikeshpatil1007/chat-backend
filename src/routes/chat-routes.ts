import { Router } from "express";
import { createChat } from "../controllers/chat-controller";
import { listMessages } from "../controllers/message-query-controller";
import { updateLastSeenController } from "../controllers/last-seen-controller";
import { markRead } from "../controllers/read-receipt-controller";
import { sendMessage } from "../controllers/message-controller";
import {
  addGroupMembersController,
  createGroupChatController,
  removeGroupMemberController
} from "../controllers/group-chat-controller";
import {
  deleteMessageController,
  editMessageController
} from "../controllers/message-mutation-controller";
import { requireAuth } from "../middleware/require-auth";

const chatRouter = Router();

chatRouter.post("/create", requireAuth, createChat);
chatRouter.post("/group/create", requireAuth, createGroupChatController);
chatRouter.post("/:chatId/members", requireAuth, addGroupMembersController);
chatRouter.delete("/:chatId/members/:userId", requireAuth, removeGroupMemberController);
chatRouter.post("/:chatId/message/send", requireAuth, sendMessage);
chatRouter.patch("/:chatId/message/:messageId", requireAuth, editMessageController);
chatRouter.delete("/:chatId/message/:messageId", requireAuth, deleteMessageController);
chatRouter.get("/:chatId/messages", requireAuth, listMessages);
chatRouter.post("/:chatId/message/:messageId/read", requireAuth, markRead);
chatRouter.post("/:chatId/lastseen", requireAuth, updateLastSeenController);

export { chatRouter };
