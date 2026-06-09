import { Router } from "express";
import { authorize } from "../../middlewares/authMiddleware";
import { validate } from "../../middlewares/validateMiddleware";
import * as voiceController from "./voiceController";
import {
  createVoiceChannelSchema,
  listVoiceChannelsSchema,
  voiceChannelIdSchema,
} from "./voiceValidator";

const router = Router();

router.use(authorize);

router.get("/categories", voiceController.listCategories);
router.get("/", validate(listVoiceChannelsSchema), voiceController.listVoiceChannels);
router.post("/", validate(createVoiceChannelSchema), voiceController.createVoiceChannel);
router.get("/:channelId", validate(voiceChannelIdSchema), voiceController.getVoiceChannel);
router.patch("/:channelId/end", validate(voiceChannelIdSchema), voiceController.endVoiceChannel);

export default router;
