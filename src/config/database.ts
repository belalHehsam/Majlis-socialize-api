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
        { name: "General", slug: "general", description: "General discussions" },
        { name: "Development", slug: "development", description: "Programming & coding" },
        { name: "Design", slug: "design", description: "UI/UX & graphic design" },
        { name: "Gaming", slug: "gaming", description: "Video games discussions" },
        { name: "Islamic", slug: "islamic", description: "Quran, Hadith, & general Islamic topics" },
      ]);
      console.log("Default categories seeded successfully");
    }
  } catch (err) {
    console.error("Error seeding default categories:", err);
  }
};
