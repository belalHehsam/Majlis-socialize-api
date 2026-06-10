import mongoose from "mongoose";
import dotenv from "dotenv";
import Notification from "../src/models/Notification";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");

    const result = await Notification.deleteMany({});
    console.log(`Deleted ${result.deletedCount} notifications successfully.`);

  } catch (err) {
    console.error("Error during deletion:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
