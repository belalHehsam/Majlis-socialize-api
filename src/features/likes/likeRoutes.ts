import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import { getAllLikes, getLikeById, createLike, updateLike, deleteLike } from "./likeController.js";

const router = Router();

// router.get("/",    authorize, getAllLikes);
// router.get("/:id", authorize, getLikeById);
// router.post("/",   authorize, createLike);
// router.patch("/:id", authorize, updateLike);
// router.delete("/:id", authorize, deleteLike);

export default router;
