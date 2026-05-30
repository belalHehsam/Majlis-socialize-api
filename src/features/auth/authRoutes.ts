import { Router } from "express";
import { validate } from "../../middlewares/validateMiddleware";
import { authorize } from "../../middlewares/authMiddleware";
import {
    changePassword,
    getMe,
    login,
    logout,
    register,
} from "./authController";
import {
    changePasswordSchema,
    loginSchema,
    registerSchema,
} from "./authValidator";

const router = Router();

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

router.post("/logout", authorize, logout);
router.get("/me", authorize, getMe);
router.patch(
    "/change-password",
    authorize,
    validate(changePasswordSchema),
    changePassword
);

export default router;