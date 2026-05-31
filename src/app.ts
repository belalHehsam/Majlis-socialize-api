import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { notFound } from "./utils/notFound";
import { errorHandler } from "./utils/errorHandler";
import authRoutes from "./features/auth/authRoutes";
import userRoutes from "./features/users/userRoutes";

// ── Feature Routes ────────────────────────────────────────────────────────────

const app: Application = express();

// ── 1. Global Middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(morgan("dev"));

// ── 2. Route Mounting ─────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// ── 3. Not Found Handler (must be after all routes) ───────────────────────────
app.use(notFound);

// ── 4. Global Error Handler (must be last) ────────────────────────────────────
app.use(errorHandler);

export default app;
