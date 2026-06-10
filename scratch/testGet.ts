import mongoose from "mongoose";
import dotenv from "dotenv";
import { getUserNotifications } from "../src/features/notifications/notificationService";
import User from "../src/models/User";
import "../src/models/Post"; // Import Post to register schema

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    const user = await User.findOne();
    if (!user) return;
    
    console.log("Fetching notifications for:", user._id);
    const result = await getUserNotifications(user._id.toString(), { limit: 5 });
    console.log("Response:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
