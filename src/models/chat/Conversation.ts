import mongoose, { Schema, Document, Types } from "mongoose";

export interface IConversation extends Document {
  _id: Types.ObjectId;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
      ],
      validate: {
        validator: (v: string[]) => v.length === 2,
        message: "Conversation must have exactly 2 participants",
      },
    },

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },

    lastMessageAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Note: unordered uniqueness (pair) should be enforced in application logic by
// sorting participant ids before creating a conversation.
ConversationSchema.index({ participants: 1 });

export default mongoose.model<IConversation>("Conversation", ConversationSchema);
