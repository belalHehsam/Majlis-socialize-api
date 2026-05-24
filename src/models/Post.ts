import mongoose, { Schema, Document, Types } from "mongoose";

export interface IPost extends Document {
  author: Types.ObjectId;
  content: string;
  image?: string;
  category: "quran" | "hadith" | "fiqh" | "general";
  likesCount: number;
  commentsCount: number;
  isFlagged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    image: { type: String },
    category: { type: String, enum: ["quran", "hadith", "fiqh", "general"], required: true },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", PostSchema);
