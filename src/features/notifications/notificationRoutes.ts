import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import { getNotifications, markAsRead } from "./notificationController.js";

const router = Router();

// router.get("/", authorize, getNotifications);
// router.patch("/:id/read", authorize, markAsRead);

export default router;
