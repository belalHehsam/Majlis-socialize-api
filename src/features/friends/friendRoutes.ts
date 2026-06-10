import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
} from "./friendController";
import { sendRequestSchema, requestIdParamSchema } from "./friendValidator";

const router = Router();

router.use(authorize);

router.post("/request", validate(sendRequestSchema), sendFriendRequest);

router.delete("/request/:requestId/cancel", validate(requestIdParamSchema), cancelFriendRequest);

router.patch("/request/:requestId/accept", validate(requestIdParamSchema), acceptFriendRequest);

router.delete("/request/:requestId/reject", validate(requestIdParamSchema), rejectFriendRequest);

export default router;
