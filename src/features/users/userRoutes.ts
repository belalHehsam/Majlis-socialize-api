import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import upload from "../../middlewares/uploadMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
    getMyProfile,
    getUserProfile,
    listUsers,
    updateMyAvatar,
    updateMyProfile,
    updateMySettings,
} from "./userController";
import {
    listUsersQuerySchema,
    updateProfileSchema,
    updateSettingsSchema,
    userIdParamSchema,
} from "./userValidator";

const router = Router();

router.get("/me", authorize, getMyProfile);

router.patch("/me", authorize, validate(updateProfileSchema), updateMyProfile);

router.patch("/me/avatar", authorize, upload.single("avatar"), updateMyAvatar);

router.patch(
    "/me/settings",
    authorize,
    validate(updateSettingsSchema),
    updateMySettings
);

router.get("/", authorize, validate(listUsersQuerySchema), listUsers);

router.get("/:id", authorize, validate(userIdParamSchema), getUserProfile);

export default router;