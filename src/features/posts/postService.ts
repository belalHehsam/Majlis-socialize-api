import cloudinary from "../../config/cloudinary-config";
import { moderateContent } from "../../services/moderationService";
import { getRecommendation } from "../../services/recommendationService";
import { AppError } from "../../utils/appError";
import Post from "../../models/Post";
import mongoose from "mongoose";

const AUTO_APPROVE_CONFIDENCE = 0.85;

export interface AnalyzeContentResult {
  decision: string;
  reasoning: string;
  violations?: string[];
  detectedTopic?: string;
  confidence?: number;
  moderationStatus: "approved" | "needs_review";
  isFlagged: boolean;
  recommendation?: any;
}

/**
 * Upload an image buffer to Cloudinary.
 * @returns The secure URL of the uploaded image
 */
export async function uploadToCloudinary(fileBuffer: Buffer, mimetype: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "majlis/posts",
        resource_type: "image",
        format: mimetype.split("/")[1],
        transformation: [
          { width: 1200, crop: "limit" },
          { quality: "auto", fetch_format: "auto" }
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
}

/**
 * Analyze post content using moderation and recommendation services.
 */
export async function analyzePostContent(
  content: string,
  tags?: string[],
  locale: string = "en",
  image?: { buffer: Buffer; mimetype: string }
): Promise<AnalyzeContentResult> {
  let moderationResult;
  try {
    moderationResult = await moderateContent(content, image, locale);
  } catch (error) {
    throw new AppError(
      "Content moderation service is temporarily unavailable. Please try again later.",
      503
    );
  }

  // Determine status
  let isFlagged = false;
  let moderationStatus: "approved" | "needs_review" = "approved";

  if (moderationResult.decision !== "rejected") {
    isFlagged =
      moderationResult.decision === "needs_review" ||
      (moderationResult.decision === "approved" &&
        moderationResult.confidence < AUTO_APPROVE_CONFIDENCE);
    moderationStatus = isFlagged ? "needs_review" : "approved";
  }

  let recommendation = null;
  if (moderationResult.decision !== "rejected") {
    try {
      recommendation = await getRecommendation(content, tags || [], locale);
    } catch {
      // Non-blocking
    }
  }

  return {
    ...moderationResult,
    moderationStatus,
    isFlagged,
    recommendation,
  };
}
