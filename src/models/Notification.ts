import mongoose, { Schema, Document, Types } from "mongoose";

export const notificationTypes = ["like", "comment", "friend_request", "friend_accept"] as const;
export type NotificationType = (typeof notificationTypes)[number];

export interface IBaseNotification extends Document {
  recipient: Types.ObjectId;
  sender: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILikeNotification extends IBaseNotification {
  type: "like";
  post: Types.ObjectId;
}

export interface ICommentNotification extends IBaseNotification {
  type: "comment";
  post: Types.ObjectId;
  commentText?: string;
}

export interface IFriendRequestNotification extends IBaseNotification {
  type: "friend_request";
  post?: never;
}

export interface IFriendAcceptNotification extends IBaseNotification {
  type: "friend_accept";
  post?: never;
}

export type INotification =
  | ILikeNotification
  | ICommentNotification
  | IFriendRequestNotification
  | IFriendAcceptNotification;

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: notificationTypes,
      required: true,
    },
    post: { type: Schema.Types.ObjectId, ref: "Post" },
    commentText: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", NotificationSchema);
