import { Request, Response } from "express";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import * as voiceService from "./voiceService";

export const createVoiceChannel = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }

  const { title, categoryId } = req.body;
  const channel = await voiceService.createVoiceChannel(req.user.id, title, categoryId);

  res.status(201).json(
    jsend.success({
      data: channel,
      message: "Voice channel created successfully",
    })
  );
};

export const listVoiceChannels = async (req: Request, res: Response) => {
  const channels = await voiceService.listVoiceChannels({
    categoryId: req.query.categoryId as string | undefined,
  });

  res.status(200).json(
    jsend.success({
      data: channels,
      message: "Voice channels retrieved successfully",
    })
  );
};

export const getVoiceChannel = async (req: Request, res: Response) => {
  const channel = await voiceService.getVoiceChannelById(req.params.channelId as string);

  res.status(200).json(
    jsend.success({
      data: channel,
      message: "Voice channel retrieved successfully",
    })
  );
};

export const endVoiceChannel = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }

  const channel = await voiceService.endVoiceChannel(
    req.params.channelId as string,
    req.user.id,
    req.user.role
  );

  res.status(200).json(
    jsend.success({
      data: channel,
      message: "Voice channel ended successfully",
    })
  );
};
