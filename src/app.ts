import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { notFound } from "./utils/notFound";
import { errorHandler } from "./utils/errorHandler";
import authRoutes from "./features/auth/authRoutes";
import userRoutes from "./features/users/userRoutes";
import postRoutes from "./features/posts/postRoutes";
import friendRoutes from "./features/friends/friendRoutes"
import notificationRoutes from "./features/notifications/notificationRoutes";
import chatRoutes from "./features/chat/chatRoutes";
import voiceRoutes from "./features/voice/voiceRoutes";

// ── Feature Routes ────────────────────────────────────────────────────────────

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: [process.env.CLIENT_URL ?? "http://localhost:5173", "http://localhost:5173"] }));
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/friends", friendRoutes)
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/voice-channels", voiceRoutes);

app.use(notFound);

app.use(errorHandler);

export default app;
