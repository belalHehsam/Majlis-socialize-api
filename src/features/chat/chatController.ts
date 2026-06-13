import { Readable } from "stream";
import { Request, Response } from "express";
import * as chatService from "./chatService";
import { AppError } from "../../utils/appError";
import jsend from "../../utils/jsend";
import cloudinary from "../../config/cloudinary-config";
import SocketService from "../../socket/socketService";

const uploadMediaToCloudinary = async (file: Express.Multer.File) => {
  return await new Promise<{
    secure_url: string;
    public_id: string;
  }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "majlis/chats",
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Media upload failed"));
          return;
        }

        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    Readable.from(file.buffer).pipe(uploadStream);
  });
};

export const sendMessage = async (req: Request, res: Response) => {
  const { recipientId, content } = req.body;
  if (!req.user) {
    throw new AppError("User not found", 404);
  }

  const mediaFile = req.file;
  if (!content?.trim() && !mediaFile) {
    throw new AppError("Message content or media is required", 400);
  }

  const media = mediaFile ? await uploadMediaToCloudinary(mediaFile) : undefined;

  const message = await chatService.sendMessage(
    req.user.id,
    recipientId,
    content,
    media
      ? {
          url: media.secure_url,
          publicId: media.public_id,
          mimeType: mediaFile?.mimetype,
        }
      : undefined
  );

  // 🔥 broadcast new message via Socket.IO to the room
  const messageConversationId = message.conversation.toString();
  SocketService.emitToRoom("chat:newMessage", messageConversationId, message);

  // Send a direct message event to the recipient
  SocketService.emitToUser(recipientId, "chat:messageReceived", message);

  // 🔔 offline notification if the recipient is not online
  if (!SocketService.isOnline(recipientId)) {
    const sender = (message as any).sender || { _id: req.user.id };
    const senderObjectId = sender._id ?? req.user.id;
    const senderIdStr = senderObjectId.toString();
    const messageId = message._id.toString();
    const previewContent = message.type === "image" ? "Image attachment" : message.content;

    SocketService.notifyUser(recipientId, {
      type: "new_message",
      fromUser: {
        _id: senderIdStr,
        username: sender.username,
        avatar: sender.avatar,
      },
      conversationId: messageConversationId,
      messageId,
      message: {
        _id: messageId,
        content: previewContent,
        sender: senderIdStr,
        recipient: recipientId,
        conversation: messageConversationId,
        type: message.type,
        mediaUrl: message.mediaUrl,
        mediaMimeType: message.mediaMimeType,
        createdAt: message.createdAt,
      },
      createdAt: message.createdAt,
    });
  }

  res.status(201).json(
    jsend.success({
      data: message,
      message: "Message sent successfully",
    })
  );
};

export const getMessages = async (req: Request, res: Response) => {
  const conversationId = req.params.conversationId as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;

  const messages = await chatService.getMessages(conversationId, {
    page,
    limit,
  });
  res.status(200).json(
    jsend.success({
      data: messages,
      message: "Messages retrieved successfully",
    })
  );
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const userId = req.user.id;

  const conversations = await chatService.getUserConversations(userId);

  res.status(200).json(
    jsend.success({
      data: conversations,
      message: "Conversations retrieved successfully",
    })
  );
};

export const getOrCreateConversationWithUser = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const currentUserId = req.user.id;
  const otherUserId = req.params.userId as string;

  const conversation = await chatService.getOrCreateConversation(currentUserId, otherUserId);

  res.status(200).json(
    jsend.success({
      data: conversation,
      message: "Conversation retrieved or created successfully",
    })
  );
};

export const markConversationAsRead = async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("User not found", 404);
  }
  const userId = req.user.id;
  const conversationId = req.params.conversationId as string;

  await chatService.markConversationAsRead(conversationId, userId);

  res.status(200).json(
    jsend.success({
      message: "Conversation marked as read",
    })
  );
};
