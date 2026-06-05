import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
import upload from "../../middlewares/uploadMiddleware";
import { createPostSchema, updatePostSchema, postIdParamSchema,feedQuerySchema} from "./postValidator";
import { getAllPosts, getPostById, createPost, updatePost, deletePost, analyzePost, togglePostLike,  getHomeFeed} from "./postController";

const router = Router();

//  Home Feed Endpoint (Placed strictly above dynamic `/:id` queries to avoid route matching conflicts)
router.get("/feed", authorize, validate(feedQuerySchema), asyncWrapper(getHomeFeed));

router.get("/", authorize, asyncWrapper(getAllPosts));
router.get("/:id", authorize, asyncWrapper(getPostById));
router.post("/analyze", authorize, upload.none(), validate(createPostSchema), asyncWrapper(analyzePost));
router.post("/", authorize, upload.single("image"), validate(createPostSchema), asyncWrapper(createPost));
router.patch("/:id", validate(updatePostSchema), authorize, asyncWrapper(updatePost));
router.delete("/:id", authorize, asyncWrapper(deletePost));

// Dynamic Like/Unlike Toggle Interaction Endpoint
router.post("/:id/like", authorize, validate(postIdParamSchema), asyncWrapper(togglePostLike));

export default router;
