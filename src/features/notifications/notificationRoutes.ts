import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getUnreadCount,
  triggerTestNotifications,
} from "./notificationController";

const router = Router();
router.use(authorize);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

// Testing endpoint to explicitly trigger socket notifications
router.post("/test", triggerTestNotifications);

export default router;
