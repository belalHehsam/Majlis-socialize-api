import { Request, Response, NextFunction } from "express";
import Post from "../../models/Post";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import cloudinary from "../../config/cloudinary-config";
import { moderateContent } from "../../services/moderationService";
import { getRecommendation } from "../../services/recommendationService";
import Like from "../../models/Like";
import mongoose from "mongoose";
import { AggregateFeatures } from "./../../utils/AggregateFeatures";
import { analyzePostContent, uploadToCloudinary } from "./postService";
import Friend from "../../models/Friend";
import User from "../../models/User";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getAcceptedFriendIds = async (userId: string): Promise<Set<string>> => {
  const friendships = await Friend.find({
    status: "accepted",
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select("requester recipient")
    .lean();

  return new Set(
    friendships.map((friendship) => {
      const requesterId = friendship.requester.toString();
      const recipientId = friendship.recipient.toString();

      return requesterId === userId ? recipientId : requesterId;
    })
  );
};

const getHiddenPrivateAuthorIds = async (viewerId: string) => {
  const friendIds = await getAcceptedFriendIds(viewerId);
  const visiblePrivateAuthorIds = [viewerId, ...friendIds];

  const hiddenPrivateUsers = await User.find({
    "settings.isPrivateProfile": true,
    _id: { $nin: visiblePrivateAuthorIds },
  })
    .select("_id")
    .lean();

  return hiddenPrivateUsers.map((user) => user._id);
};

const applyPrivateAuthorFilter = async (
  filter: Record<string, any>,
  viewerId: string
): Promise<void> => {
  const hiddenPrivateAuthorIds = await getHiddenPrivateAuthorIds(viewerId);

  if (hiddenPrivateAuthorIds.length > 0) {
    filter.author = { $nin: hiddenPrivateAuthorIds };
  }
};

const getPostAuthorId = (post: any): string | undefined => {
  const author = post.author;

  if (!author) return undefined;

  if (author._id) {
    return author._id.toString();
  }

  return author.toString();
};

const canViewerAccessPost = (
  post: any,
  viewerId: string,
  friendIds: Set<string>
): boolean => {
  const authorId = getPostAuthorId(post);

  if (!authorId) return false;

  const isOwnPost = authorId === viewerId;
  const isFriend = authorId ? friendIds.has(authorId) : false;
  const isPrivateAuthor = post.author?.settings?.isPrivateProfile === true;

  return !isPrivateAuthor || isOwnPost || isFriend;
};

const removeAuthorSettings = (post: any) => {
  if (post.author?.settings) {
    delete post.author.settings;
  }

  return post;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * @desc    Analyze post content (moderation + recommendation) without saving
 * @route   POST /api/v1/posts/analyze
 * @access  Private
 */
export const analyzePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { content, tags } = req.body;
  const locale = req.headers["accept-language"]?.startsWith("ar") ? "ar" : "en";
  const image = req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : undefined;

  const result = await analyzePostContent(content, tags, locale, image);

  if (result.decision === "rejected") {
    res.status(422).json(
      jsend.fail(
        {
          content: result.reasoning,
          violations: result.violations,
        },
        "Your post does not meet our content guidelines"
      )
    );
    return;
  }

  res.status(200).json(
    jsend.success({
      moderation: {
        status: result.moderationStatus,
        reasoning: result.reasoning,
        detectedTopic: result.detectedTopic,
      },
      recommendation: result.recommendation,
    })
  );
};

/**
 * @desc    Create a new post
 * @route   POST /api/v1/posts
 * @access  Private
 */
export const createPost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { content, tags, commentsEnabled } = req.body;
  const userId = req.user!.id;
  const image = req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : undefined;

  const result = await analyzePostContent(content, tags, "en", image);

  if (result.decision === "rejected") {
    res.status(422).json(
      jsend.fail(
        {
          content: result.reasoning,
          violations: result.violations,
        },
        "Your post does not meet our content guidelines"
      )
    );
    return;
  }

  let recommendation = req.body.recommendation || null;

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
    isFlagged: result.isFlagged,
    moderationStatus: result.moderationStatus,
    recommendation: recommendation ?? undefined,
  });

  // Populate author for the response
  await post.populate("author", "username avatar");

  res.status(201).json(
    jsend.success({
      post,
      moderation: {
        status: result.moderationStatus,
        reasoning: result.reasoning,
        detectedTopic: result.detectedTopic,
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

  // Optional keyword search on post content
  if (req.query.search) {
    filter.content = { $regex: req.query.search as string, $options: "i" };
  }

  await applyPrivateAuthorFilter(filter, req.user!.id);

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .populate("author", "username displayName avatar bio")
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    })
  );
};

/**
 * @desc    Get a single post by ID
 * @route   GET /api/v1/posts/:id
 * @access  Private
 */
export const getPostById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const post = await Post.findById(req.params.id)
    .populate("author", "username avatar settings.isPrivateProfile")
    .lean();

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  const friendIds = await getAcceptedFriendIds(req.user!.id);

  if (!canViewerAccessPost(post, req.user!.id, friendIds)) {
    return next(new AppError("Post not found", 404));
  }

  // Non-admin users cannot see posts under review
  if (
    post.moderationStatus === "needs_review" &&
    req.user?.role !== "admin" &&
    String(post.author._id) !== req.user?.id
  ) {
    return next(new AppError("Post not found", 404));
  }

  res.status(200).json(jsend.success({ post: removeAuthorSettings(post) }));
};

/**
 * @desc    Update own post
 * @route   PATCH /api/v1/posts/:id
 * @access  Private (owner only)
 */
export const updatePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    return next(new AppError("Post not found", 404));
  }

  if (String(post.author) !== req.user!.id) {
    return next(new AppError("You can only update your own posts", 403));
  }

  // If content changes, re-run moderation
  if (req.body.content && req.body.content !== post.content) {
    const result = await analyzePostContent(req.body.content, req.body.tags ?? post.tags);

    if (result.decision === "rejected") {
      res.status(422).json(
        jsend.fail(
          {
            content: result.reasoning,
            violations: result.violations,
          },
          "Your updated content does not meet our content guidelines"
        )
      );
      return;
    }

    post.isFlagged = result.isFlagged;
    post.moderationStatus = result.moderationStatus;
    post.recommendation = result.recommendation ?? undefined;
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
export const deletePost = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
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

/**
 * @desc    Toggle Like / Unlike on a post dynamically
 * @route   POST /api/v1/posts/:id/like
 * @access  Private
 */

export const togglePostLike = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    return next(new AppError("Post not found", 404));
  }

  if (typeof req.params.id !== "string") {
    return next(new AppError("Invalid post id", 400));
  }

  const userId = req.user.id;
  const postId = req.params.id;

  const post = await Post.findById(postId)
    .populate("author", "settings.isPrivateProfile")
    .lean();

  if (!post) return next(new AppError("Post not found", 404));

  const friendIds = await getAcceptedFriendIds(userId);

  if (!canViewerAccessPost(post, userId, friendIds)) {
    return next(new AppError("Post not found", 404));
  }

  const existingLike = await Like.findOne({ user: userId, post: postId });

  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $inc: { likesCount: -1 } },
      { new: true, runValidators: true }
    );

    if (!updatedPost) {
      return next(new AppError("Post not found", 404));
    }
    res.status(200).json(jsend.success("Post unliked successfully"));
    return;
  }

  await Like.create({ user: userId, post: postId });

  const updatedPost = await Post.findByIdAndUpdate(
    postId,
    { $inc: { likesCount: 1 } },
    { new: true, runValidators: true }
  );
  if (!updatedPost) {
    // Rollback the like document if the post was deleted mid-request
    await Like.deleteOne({ user: userId, post: postId });
    return next(new AppError("Post not found", 404));
  }
  res.status(200).json(jsend.success("Post liked successfully"));
};

/**
 * @desc    Get paginated home feed with personalized like context states
 * @route   GET /api/v1/posts/feed
 * @access  Private
 */

export const getHomeFeed = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) return next(new AppError("You are not logged in", 401));

  const currentUserId = new mongoose.Types.ObjectId(req.user.id);
  const matchCriteria: Record<string, any> = { moderationStatus: "approved" };

  if (req.query.tag && req.query.tag !== "All") {
    matchCriteria.tags = req.query.tag;
  }

  await applyPrivateAuthorFilter(matchCriteria, req.user.id);

  const features = new AggregateFeatures(req.query)
    .match(matchCriteria)
    .sort({ createdAt: -1 })
    .paginate();

  features.pipleLine.push(
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },

    {
      $unwind: "$authorDetails",
    },

    {
      $lookup: {
        from: "likes",
        let: { postId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ["$post", "$$postId"] }, { $eq: ["$user", currentUserId] }],
              },
            },
          },
        ],
        as: "currentUserLike",
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        image: 1,
        tags: 1,
        likesCount: 1,
        commentsCount: 1,
        commentsEnabled: 1,
        recommendation: 1,
        createdAt: 1,
        updatedAt: 1,
        author: {
          _id: "$authorDetails._id",
          username: "$authorDetails.username",
          displayName: "$authorDetails.displayName",
          avatar: "$authorDetails.avatar",
          bio: "$authorDetails.bio",
        },
        //  Converts array matches to an instant toggleable boolean flag for TanStack Query
        isLiked: { $gt: [{ $size: "$currentUserLike" }, 0] },
      },
    }
  );

  const aggregatePosts = await Post.aggregate(features.pipleLine);

  const totalApprovedPosts = await Post.countDocuments(matchCriteria);

  const pagination = features.buildPagination(totalApprovedPosts, aggregatePosts.length);

  res.status(200).json({ status: "success", data: { posts: aggregatePosts, pagination } });
};
