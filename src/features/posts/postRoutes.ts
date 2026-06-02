import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
import upload from "../../middlewares/uploadMiddleware";
import { createPostSchema, updatePostSchema } from "./postValidator";
import { getAllPosts, getPostById, createPost, updatePost, deletePost, analyzePost } from "./postController";

const router = Router();

router.get("/", authorize, asyncWrapper(getAllPosts));
router.get("/:id", authorize, asyncWrapper(getPostById));
router.post("/analyze", authorize, upload.none(), validate(createPostSchema), asyncWrapper(analyzePost));
router.post("/", authorize, upload.single("image"), validate(createPostSchema), asyncWrapper(createPost));
router.patch("/:id", validate(updatePostSchema), authorize, asyncWrapper(updatePost));
router.delete("/:id", authorize, asyncWrapper(deletePost));

export default router;
