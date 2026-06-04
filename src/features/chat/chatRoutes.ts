import { Router } from "express";
import * as chatController from "./chatController";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import { sendMessageSchema, getMessagesSchema } from "./chatValidator";
const router = Router();

router.use(authorize);

router.get("/conversations", chatController.getConversations);
router.get("/conversations/with/:userId", chatController.getOrCreateConversationWithUser);
router.get(
  "/conversations/:conversationId/messages",
  validate(getMessagesSchema),
  chatController.getMessages
);
router.post("/messages", validate(sendMessageSchema), chatController.sendMessage);
router.patch("/conversations/:conversationId/read", chatController.markConversationAsRead);
export default router;
