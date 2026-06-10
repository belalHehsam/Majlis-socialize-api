import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User";
import Post from "../src/models/Post";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("Connected to MongoDB");

    const email = "faridaahmed212004@gmail.com";
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email ${email} NOT FOUND in the database.`);
      return;
    }

    console.log(`Found user: ${user.username} (ID: ${user._id})`);

    const postsCount = await Post.countDocuments({ author: user._id });
    console.log(`\nTotal posts authored by this user: ${postsCount}`);

    if (postsCount > 0) {
      const latestPosts = await Post.find({ author: user._id })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
      
      console.log("\nLatest 3 posts:");
      latestPosts.forEach((post, index) => {
        console.log(`${index + 1}. [${post.createdAt}] ${post.content?.substring(0, 50)}...`);
      });
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
