import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import {} from "../../utils/asyncWrapper";
// import { search } from "./searchController.js";

const router = Router();

// router.get("/", authorize, search);

export default router;
