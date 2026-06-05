import mongoose, { Schema, Document, Types } from "mongoose";

export interface ILike extends Document {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LikeSchema = new Schema<ILike>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// High-Performance Optimization: Prevents duplicate likes from a single user on any given post
LikeSchema.index({ user: 1, post: 1 }, { unique: true });

export default mongoose.model<ILike>("Like", LikeSchema);
