import mongoose from "mongoose";
import Category from "../models/Category";

/**
 * Connect to MongoDB using MONGO_URI from environment variables.
 */
export const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI is not defined in environment variables.");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");

  // Seed default categories if none exist
  try {
    const count = await Category.countDocuments();
    if (count === 0) {
      console.log("Seeding default categories...");
      await Category.create([
        { name: "Quran", slug: "quran", description: "Quran studies, recitation, and reflections" },
        { name: "Hadith", slug: "hadith", description: "Prophetic traditions and narrations" },
        { name: "Fiqh", slug: "fiqh", description: "Islamic jurisprudence and rulings" },
        { name: "Dua", slug: "dua", description: "Supplications, prayers, and remembrance" },
        { name: "Tafsir", slug: "tafsir", description: "Quranic exegesis and commentary" },
        { name: "Seerah", slug: "seerah", description: "Biography of the Prophet Muhammad (PBUH)" },
        { name: "Reminder", slug: "reminder", description: "Spiritual reminders and advice" },
      ]);
      console.log("Default categories seeded successfully");
    }
  } catch (err) {
    console.error("Error seeding default categories:", err);
  }
};
