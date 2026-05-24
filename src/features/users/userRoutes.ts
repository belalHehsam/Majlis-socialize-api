import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import { getAllUsers, getUserById, createUser, updateUser, deleteUser } from "./userController.js";

const router = Router();

// router.get("/", authorize, getAllUsers);
// router.get("/:id", authorize, getUserById);
// router.post("/", authorize, createUser);
// router.patch("/:id", authorize, updateUser);
// router.delete("/:id", authorize, deleteUser);

export default router;
