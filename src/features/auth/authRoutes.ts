import { Router } from "express";
import { validate } from "../../middlewares/validateMiddleware";
import { asyncWrapper } from "../../utils/asyncWrapper";
// import { register, login } from "./authController.js";
import { registerSchema, loginSchema } from "./authValidator";

const router = Router();

// router.post("/register", validate(registerSchema), register);
// router.post("/login",    validate(loginSchema),    login);

export default router;
