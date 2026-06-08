import mongoose, { Document, Schema, Types } from "mongoose";

export interface IVoiceChannelParticipant {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  joinedAt: Date;
  isMuted: boolean;
  isDeafened: boolean;
}

export interface IVoiceChannel extends Document {
  _id: Types.ObjectId;
  title: string;
  category: Types.ObjectId;
  createdBy: Types.ObjectId;
  status: "active" | "ended";
  endedAt?: Date;
  participants: IVoiceChannelParticipant[];
  createdAt: Date;
  updatedAt: Date;
}

const VoiceChannelParticipantSchema = new Schema<IVoiceChannelParticipant>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isDeafened: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const VoiceChannelSchema = new Schema<IVoiceChannel>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },
    endedAt: {
      type: Date,
    },
    participants: {
      type: [VoiceChannelParticipantSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

VoiceChannelSchema.index({ category: 1, status: 1, createdAt: -1 });

export default mongoose.model<IVoiceChannel>("VoiceChannel", VoiceChannelSchema);
