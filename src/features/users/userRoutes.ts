import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import upload from "../../middlewares/uploadMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
    getMyProfile,
    getUserProfile,
    listUsers,
    updateMyAvatar,
    updateMyCoverPhoto,
    updateMyProfile,
    updateMySettings,
} from "./userController";
import {
    getMyProfileSchema,
    getUserProfileSchema,
    listUsersQuerySchema,
    updateProfileSchema,
    updateSettingsSchema,
} from "./userValidator";

const router = Router();

router.get("/me", authorize, validate(getMyProfileSchema), getMyProfile);

router.patch("/me", authorize, validate(updateProfileSchema), updateMyProfile);

router.patch("/me/avatar", authorize, upload.single("avatar"), updateMyAvatar);
router.patch(
    "/me/cover-photo",
    authorize,
    upload.single("coverPhoto"),
    updateMyCoverPhoto
);

router.patch(
    "/me/settings",
    authorize,
    validate(updateSettingsSchema),
    updateMySettings
);

router.get("/", authorize, validate(listUsersQuerySchema), listUsers);

router.get("/:id", authorize, validate(getUserProfileSchema), getUserProfile);

export default router;
