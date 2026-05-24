import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import {
//   getAllComments,
//   getCommentById,
//   createComment,
//   updateComment,
//   deleteComment,
// } from "./commentController.js";

const router = Router();

// router.get("/", authorize, getAllComments);
// router.get("/:id", authorize, getCommentById);
// router.post("/", authorize, createComment);
// router.patch("/:id", authorize, updateComment);
// router.delete("/:id", authorize, deleteComment);

export default router;
