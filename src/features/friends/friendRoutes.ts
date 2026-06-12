import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listFriends,
  getFriendRequests,
  getFriendSuggestions,
} from "./friendController";
import { sendRequestSchema, requestIdParamSchema, listFriendsQuerySchema } from "./friendValidator";

const router = Router();

router.use(authorize);

router.post("/request", validate(sendRequestSchema), sendFriendRequest);
router.get("/request", getFriendRequests);

router.delete("/request/:requestId/cancel", validate(requestIdParamSchema), cancelFriendRequest);

router.patch("/request/:requestId/accept", validate(requestIdParamSchema), acceptFriendRequest);

router.delete("/request/:requestId/reject", validate(requestIdParamSchema), rejectFriendRequest);

router.get("/", validate(listFriendsQuerySchema), listFriends);
router.get("/suggestions", getFriendSuggestions);

export default router;
