import { NotificationType } from "../../models/Notification";

export interface NotificationData {
  recipient: string;
  sender: string;
  type: NotificationType;
  post?: string;
}