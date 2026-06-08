import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
  _id: Types.ObjectId;
  conversation: Types.ObjectId;
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  content: string;
  type: "text" | "image";
  isEdited?: boolean;
  isDeleted?: boolean;
  readAt?: Date;
  mediaUrl?: string;
  mediaPublicId?: string;
  mediaMimeType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      trim: true,
      default: "",
    },

    type: {
      type: String,
      enum: ["text", "image"],
      default: "text",
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
    },

    mediaUrl: {
      type: String,
    },

    mediaPublicId: {
      type: String,
    },

    mediaMimeType: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversation: 1, createdAt: 1 });
MessageSchema.index({ conversation: 1, isDeleted: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
