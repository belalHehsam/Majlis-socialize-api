import express, { Application } from "express";
import cors from "cors";
import morgan from "morgan";
import { notFound } from "./utils/notFound";
import { errorHandler } from "./utils/errorHandler";

// ── Feature Routes ────────────────────────────────────────────────────────────

const app: Application = express();

// ── 1. Global Middleware ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:3000" }));
app.use(morgan("dev"));

// ── 2. Route Mounting ─────────────────────────────────────────────────────────

// ── 3. Not Found Handler (must be after all routes) ───────────────────────────
app.use(notFound);

// ── 4. Global Error Handler (must be last) ────────────────────────────────────
app.use(errorHandler);

export default app;
