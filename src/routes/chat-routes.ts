import { Router } from "express";
import { createChat } from "../controllers/chat-controller";
import { listMessages } from "../controllers/message-query-controller";
import { updateLastSeenController } from "../controllers/last-seen-controller";
import { markRead } from "../controllers/read-receipt-controller";
import { sendMessage } from "../controllers/message-controller";
import { requireAuth } from "../middleware/require-auth";

const chatRouter = Router();

chatRouter.post("/create", requireAuth, createChat);
chatRouter.post("/:chatId/message/send", requireAuth, sendMessage);
chatRouter.get("/:chatId/messages", requireAuth, listMessages);
chatRouter.post("/:chatId/message/:messageId/read", requireAuth, markRead);
chatRouter.post("/:chatId/lastseen", requireAuth, updateLastSeenController);

export { chatRouter };
