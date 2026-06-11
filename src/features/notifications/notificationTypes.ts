type BaseCreateData = { recipient: string; sender: string };

export type CreateNotificationData =
  | (BaseCreateData & { type: "like"; post: string })
  | (BaseCreateData & { type: "comment"; post: string; commentText?: string })
  | (BaseCreateData & { type: "friend_request" | "friend_accept" });
