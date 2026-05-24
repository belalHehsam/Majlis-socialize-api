import mongoose from "mongoose";
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
};
