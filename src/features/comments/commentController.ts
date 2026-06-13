import { Request, Response, NextFunction } from "express";
import Comment from "../../models/Comment";
import Post from "../../models/Post";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";

/**
 * @desc    Create a new comment
 * @route   POST /api/v1/comments
 * @access  Private
 */
export const createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        return next(new AppError("You are not logged in", 401));
    }

    const { postId, content } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
        return next(new AppError("Post not found", 404));
    }

    if (!post.commentsEnabled) {
        return next(new AppError("Comments are disabled for this post", 403));
    }

    const comment = await Comment.create({
        post: postId,
        author: req.user.id,
        content,
    });

    await Post.findByIdAndUpdate(postId, {
        $inc: { commentsCount: 1 },
    });

    await comment.populate("author", "username avatar");

    res.status(201).json(
        jsend.success({
            comment,
        })
    );
};

/**
 * @desc    Get comments, optionally by postId
 * @route   GET /api/v1/comments?postId=x
 * @access  Public
 */
export const getComments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const postId = req.query.postId as string | undefined;

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 15));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (postId) {
        const postExists = await Post.exists({ _id: postId });

        if (!postExists) {
            return next(new AppError("Post not found", 404));
        }

        filter.post = postId;
    }

    const [comments, total] = await Promise.all([
        Comment.find(filter)
            .populate("author", "username avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Comment.countDocuments(filter),
    ]);

    res.status(200).json(
        jsend.success({
            comments,
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
 * @desc    Get one comment by ID
 * @route   GET /api/v1/comments/:id
 * @access  Public
 */
export const getCommentById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const comment = await Comment.findById(req.params.id).populate(
        "author",
        "username avatar"
    );

    if (!comment) {
        return next(new AppError("Comment not found", 404));
    }

    res.status(200).json(
        jsend.success({
            comment,
        })
    );
};

/**
 * @desc    Update own comment
 * @route   PATCH /api/v1/comments/:id
 * @access  Private
 */
export const updateComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        return next(new AppError("You are not logged in", 401));
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
        return next(new AppError("Comment not found", 404));
    }

    if (String(comment.author) !== req.user.id) {
        return next(new AppError("You can only update your own comments", 403));
    }

    comment.content = req.body.content;

    await comment.save();
    await comment.populate("author", "username avatar");

    res.status(200).json(
        jsend.success({
            comment,
        })
    );
};

/**
 * @desc    Delete own comment or comment on own post
 * @route   DELETE /api/v1/comments/:id
 * @access  Private
 */
export const deleteComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        return next(new AppError("You are not logged in", 401));
    }

    const comment = await Comment.findById(req.params.id);

    if (!comment) {
        return next(new AppError("Comment not found", 404));
    }

    const post = await Post.findById(comment.post).select("author");
    const isCommentAuthor = String(comment.author) === req.user.id;
    const isPostAuthor = post ? String(post.author) === req.user.id : false;

    if (!isCommentAuthor && !isPostAuthor) {
        return next(
            new AppError("You can only delete your own comments or comments on your own posts", 403)
        );
    }

    const postId = comment.post;

    await comment.deleteOne();

    await Post.updateOne(
        {
            _id: postId,
            commentsCount: { $gt: 0 },
        },
        {
            $inc: { commentsCount: -1 },
        }
    );

    res.status(200).json(
        jsend.success({
            message: "Comment deleted successfully",
        })
    );
};
