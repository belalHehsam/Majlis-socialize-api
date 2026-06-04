import { Request, Response } from "express";
import * as chatService from "./chatService";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";

export const sendMessage = async (req: Request, res: Response) => {
  const { recipientId, content } = req.body;
  if (!req.user) {
    throw new AppError("User not found", 404);
  }

  const message = await chatService.sendMessage(req.user.id, recipientId, content);

  jsend.success({
    data: message,
    message: "Message sent successfully",
  });
};

export const getMessages = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const messages = await chatService.getMessages(conversationId, {
    page,
    limit,
  });
  res.status(200).json({
    data: messages,
    message: "Messages retrieved successfully",
  });
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const userId = req.user.id;

  const conversations = await chatService.getUserConversations(userId);

  jsend.success({
    data: conversations,
    message: "Conversations retrieved successfully",
  });
};

export const getOrCreateConversationWithUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId as string;

  const conversation = await chatService.getOrCreateConversation(currentUserId, otherUserId);

  jsend.success({
    data: conversation,
    message: "Conversation retrieved or created successfully",
  });
};

export const markConversationAsRead = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const userId = req.user.id;
  const conversationId = req.params.conversationId as string;

  await chatService.markConversationAsRead(conversationId, userId);

  jsend.success({
    message: "Conversation marked as read",
  });
};
