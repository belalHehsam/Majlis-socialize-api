export type NotificationType = "like" | "comment" | "friend_request" | "friend_accept";

interface NotificationPayload {
  type: NotificationType;
  fromUserId: string;
  postId?: string;
}
