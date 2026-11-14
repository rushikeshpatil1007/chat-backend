import { Router } from "express";
import { listUserChatsController } from "../controllers/user-chat-controller";
import { requireAuth } from "../middleware/require-auth";

const userRouter = Router();

userRouter.get("/:userId/chats", requireAuth, listUserChatsController);

export { userRouter };
