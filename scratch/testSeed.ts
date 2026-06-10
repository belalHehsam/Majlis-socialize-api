import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedTestNotificationsIfNeeded } from "../src/socket/socketManager";
import User from "../src/models/User";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");

    const user = await User.findOne();
    if (!user) {
      console.log("No user found");
      return;
    }

    console.log("Testing seed for user:", user.username);
    await seedTestNotificationsIfNeeded(user._id.toString(), true);
    console.log("Seed completed successfully!");
  } catch (err) {
    console.error("Error during seed:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
