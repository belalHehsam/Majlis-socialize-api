import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  triggerTestNotifications,
} from "./notificationController";
import { getNotificationsSchema } from "./notificationValidator";

const router = Router();
router.use(authorize);

router.get("/", validate(getNotificationsSchema), getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

// Testing endpoint to explicitly trigger socket notifications
router.post("/test", triggerTestNotifications);

export default router;
