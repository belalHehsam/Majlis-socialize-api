import mongoose, { Schema, Document, Types } from "mongoose";

export type FriendStatus = "pending" | "accepted" | "rejected";

export interface IFriend extends Document {
  requester: Types.ObjectId;
  recipient: Types.ObjectId;
  status: FriendStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" },
  },
  { timestamps: true }
);

FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model<IFriend>("Friend", FriendSchema);
