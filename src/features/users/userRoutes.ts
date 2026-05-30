import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import {
    getMyProfile,
    updateMyProfile,
    updateMySettings,
} from "./userController";
import { updateProfileSchema, updateSettingsSchema } from "./userValidator";

const router = Router();

router.get("/me", authorize, getMyProfile);
router.patch("/me", authorize, validate(updateProfileSchema), updateMyProfile);
router.patch(
    "/me/settings",
    authorize,
    validate(updateSettingsSchema),
    updateMySettings
);

export default router;