import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import * as categoryController from "./categoryController";

const router = Router();

router.use(authorize);

router.get("/", categoryController.listCategories);

export default router;
