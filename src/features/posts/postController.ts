import { Request, Response, NextFunction } from "express";
import Post from "../../models/Post";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import cloudinary from "../../config/cloudinary-config";
import { moderateContent } from "../../services/moderationService";
import { getRecommendation } from "../../services/recommendationService";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum confidence for auto-approval (below this → flagged for review) */
const AUTO_APPROVE_CONFIDENCE = 0.85;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Upload an image buffer to Cloudinary.
 * @returns The secure URL of the uploaded image
 */
async function uploadToCloudinary(fileBuffer: Buffer, mimetype: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "majlis/posts",
        resource_type: "image",
        format: mimetype.split("/")[1],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    stream.end(fileBuffer);
  });
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * @desc    Create a new post with AI moderation and recommendation
 * @route   POST /api/v1/posts
 * @access  Private
 */
export const createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { content, tags, commentsEnabled } = req.body;
  const userId = req.user!.id;


  let moderationResult;
  try {
    moderationResult = await moderateContent(content);
  } catch {
    // If AI moderation fails, reject to be safe — we don't want unmoderated posts
    return next(new AppError("Content moderation service is temporarily unavailable. Please try again later.", 503));
  }

  // Rejected — do NOT save
  if (moderationResult.decision === "rejected") {
    res.status(422).json(
      jsend.fail(
        {
          content: moderationResult.reasoning,
          violations: moderationResult.violations,
        },
        "Your post does not meet our content guidelines"
      )
    );
    return;
  }

  // Determine moderation status
  const isFlagged =
    moderationResult.decision === "needs_review" ||
    (moderationResult.decision === "approved" && moderationResult.confidence < AUTO_APPROVE_CONFIDENCE);

  const moderationStatus = isFlagged ? "needs_review" : "approved";

  let recommendation = null;
  try {
    recommendation = await getRecommendation(content, tags);
  } catch {
    // Recommendation failure is non-blocking — post still saves
  }

  let imageUrl: string | undefined;
  if (req.file) {
    try {
      imageUrl = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    } catch {
      return next(new AppError("Image upload failed. Please try again.", 500));
    }
  }

  const post = await Post.create({
    author: userId,
    content,
    tags,
    commentsEnabled: commentsEnabled ?? true,
    image: imageUrl,
    isFlagged,
    moderationStatus,
    recommendation: recommendation ?? undefined,
  });

  // Populate author for the response
  await post.populate("author", "username avatar");

  res.status(201).json(
    jsend.success({
      post,
      moderation: {
        status: moderationStatus,
        reasoning: moderationResult.reasoning,
        detectedTopic: moderationResult.detectedTopic,
      },
    })
  );
};

/**
 * @desc    Get all posts (paginated, newest first)
 * @route   GET /api/v1/posts
 * @access  Private
 */
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};

  // Only show approved posts to regular users; admins see all
  if (req.user?.role !== "admin") {
    filter.moderationStatus = "approved";
  }

  // Optional tag filter
  if (req.query.tag) {
    filter.tags = { $in: [req.query.tag] };
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "username avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Post.countDocuments(filter),
  ]);

  res.status(200).json(
    jsend.success({
      posts,
      pagination: {
        currentPage: page,
        perPage: limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
};

/**
 * @desc    Get a single post by ID
 * @route   GET /api/v1/posts/:id
 * @access  Private
 */
export const getPostById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const post = await Post.findById(req.params.id)
    .populate("author", "username avatar")
    .lean();

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  // Non-admin users cannot see posts under review
  if (post.moderationStatus === "needs_review" && req.user?.role !== "admin" && String(post.author._id) !== req.user?.id) {
    return next(new AppError("Post not found", 404));
  }

  res.status(200).json(jsend.success({ post }));
};

/**
 * @desc    Update own post
 * @route   PATCH /api/v1/posts/:id
 * @access  Private (owner only)
 */
export const updatePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  if (String(post.author) !== req.user!.id) {
    return next(new AppError("You can only update your own posts", 403));
  }

  // If content changes, re-run moderation
  if (req.body.content && req.body.content !== post.content) {
    let moderationResult;
    try {
      moderationResult = await moderateContent(req.body.content);
    } catch {
      return next(new AppError("Content moderation service is temporarily unavailable. Please try again later.", 503));
    }

    if (moderationResult.decision === "rejected") {
      res.status(422).json(
        jsend.fail(
          {
            content: moderationResult.reasoning,
            violations: moderationResult.violations,
          },
          "Your updated content does not meet our content guidelines"
        )
      );
      return;
    }

    const isFlagged =
      moderationResult.decision === "needs_review" ||
      (moderationResult.decision === "approved" && moderationResult.confidence < AUTO_APPROVE_CONFIDENCE);

    post.isFlagged = isFlagged;
    post.moderationStatus = isFlagged ? "needs_review" : "approved";

    // Re-generate recommendation for updated content
    try {
      const recommendation = await getRecommendation(
        req.body.content,
        req.body.tags ?? post.tags
      );
      post.recommendation = recommendation ?? undefined;
    } catch {
      // Non-blocking
    }
  }


  if (req.body.content) post.content = req.body.content;
  if (req.body.tags) post.tags = req.body.tags;
  if (req.body.commentsEnabled !== undefined) post.commentsEnabled = req.body.commentsEnabled;

  await post.save();
  await post.populate("author", "username avatar");

  res.status(200).json(jsend.success({ post }));
};

/**
 * @desc    Delete own post (or admin can delete any)
 * @route   DELETE /api/v1/posts/:id
 * @access  Private (owner or admin)
 */
export const deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  if (String(post.author) !== req.user!.id && req.user!.role !== "admin") {
    return next(new AppError("You can only delete your own posts", 403));
  }

  await post.deleteOne();

  res.status(200).json(jsend.success(null));
};
