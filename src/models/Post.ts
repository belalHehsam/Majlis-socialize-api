import mongoose, { Schema, Document, Types } from "mongoose";

export interface IRecommendation {
  type: "quran" | "hadith";
  arabicText: string;
  translationText: string;
  source: string;
  surahName?: string;
  reference: string;
  relevanceExplanation: string;
}

export interface IPost extends Document {
  author: Types.ObjectId;
  content: string;
  image?: string;
  tags: ("quran" | "hadith" | "fiqh" | "general" | "dua" | "tafsir" | "seerah" | "reminder")[];
  likesCount: number;
  commentsCount: number;
  commentsEnabled: boolean;
  isFlagged: boolean;
  moderationStatus: "approved" | "needs_review";
  recommendation?: IRecommendation;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    type: { type: String, enum: ["quran", "hadith"], required: true },
    arabicText: { type: String, required: true },
    translationText: { type: String, required: true },
    source: { type: String, required: true },
    surahName: { type: String },
    reference: { type: String, required: true },
    relevanceExplanation: { type: String, required: true },
  },
  { _id: false }
);

const PostSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    image: { type: String },
    tags: [{ type: String, enum: ["quran", "hadith", "fiqh", "general", "dua", "tafsir", "seerah", "reminder"], required: true, index: true }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    commentsEnabled: { type: Boolean, default: true },
    isFlagged: { type: Boolean, default: false, index: true },
    moderationStatus: {
      type: String,
      enum: ["approved", "needs_review"],
      default: "approved",
      index: true,
    },
    recommendation: { type: RecommendationSchema },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", PostSchema);
