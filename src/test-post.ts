/**
 * Quick test script — Generates a JWT token and tests the Create Post API.
 *
 * Usage: npx ts-node-dev src/test-post.ts
 */
import "dotenv/config";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "./models/User";
import { connectDB } from "./config/database";

const JWT_SECRET = process.env.JWT_SECRET as string;
const PORT = process.env.PORT ?? 5000;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function main() {
  // ── 1. Connect to DB ────────────────────────────────────────────────────
  await connectDB();
  console.log("✅ Connected to MongoDB\n");

  // ── 2. Create or find a test user ───────────────────────────────────────
  let user = await User.findOne({ username: "test_user" });

  if (!user) {
    user = await User.create({
      username: "test_user",
      email: "test@majlis.com",
      password: "$2b$10$dummyhashedpasswordfortesting1234567890abc", // dummy hash
      role: "user",
    });
    console.log("👤 Created test user:", user.username);
  } else {
    console.log("👤 Using existing test user:", user.username);
  }

  // ── 3. Generate JWT ─────────────────────────────────────────────────────
  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, {
    expiresIn: "1d",
  });
  console.log("\n🔑 JWT Token (use in Postman/Thunder Client):");
  console.log(`Bearer ${token}\n`);

  // ── 4. Test Create Post — Islamic content (should PASS) ─────────────────
  console.log("─".repeat(60));
  console.log("TEST 1: Islamic content (should be APPROVED)");
  console.log("─".repeat(60));

  try {
    const res1 = await fetch(`${BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content:
          "The importance of patience (sabr) in Islam cannot be overstated. Allah says in the Quran that He is with those who are patient. During times of hardship, a Muslim should turn to prayer and remembrance of Allah.",
        tags: ["quran"],
      }),
    });

    const data1 = await res1.json();
    console.log(`Status: ${res1.status}`);
    console.log("Response:", JSON.stringify(data1, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // ── 5. Test Create Post — Non-Islamic content (should FAIL) ─────────────
  console.log("\n" + "─".repeat(60));
  console.log("TEST 2: Non-Islamic content (should be REJECTED)");
  console.log("─".repeat(60));

  try {
    const res2 = await fetch(`${BASE_URL}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: "Just watched the best football match ever! What a great goal by Messi!",
        tags: ["general"],
      }),
    });

    const data2 = await res2.json();
    console.log(`Status: ${res2.status}`);
    console.log("Response:", JSON.stringify(data2, null, 2));
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // ── 6. Test Get All Posts ───────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  console.log("TEST 3: Get all posts");
  console.log("─".repeat(60));

  try {
    const res3 = await fetch(`${BASE_URL}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data3 = await res3.json();
    console.log(`Status: ${res3.status}`);
    console.log(`Total posts: ${data3.data?.posts?.length ?? 0}`);
    if (data3.data?.posts?.[0]?.recommendation) {
      console.log("\n📖 Recommendation on first post:");
      console.log(JSON.stringify(data3.data.posts[0].recommendation, null, 2));
    }
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // ── Done ────────────────────────────────────────────────────────────────
  console.log("\n✅ Tests complete!");
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
