import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import { getAllPosts, getPostById, createPost, updatePost, deletePost } from "./postController.js";

const router = Router();

// router.get("/", authorize, getAllPosts);
// router.get("/:id", authorize, getPostById);
// router.post("/", authorize, createPost);
// router.patch("/:id", authorize, pdatePost);
// router.delete("/:id", authorize, deletePost);

export default router;
