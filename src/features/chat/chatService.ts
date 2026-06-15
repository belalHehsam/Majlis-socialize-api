import Conversation from "../../models/chat/Conversation";
import Message from "../../models/chat/Message";
import APIFeatures from "../../utils/apiFeatures";
import SocketService from "../../socket/socketService";

const participantPublicFields = {
  username: 1,
  displayName: 1,
  avatar: 1,
  bio: 1,
  lastLoginAt: 1,
};

const addParticipantPresence = (conversation: any) => {
  const conversationObject =
    typeof conversation.toObject === "function" ? conversation.toObject() : conversation;

  if (Array.isArray(conversationObject.participants)) {
    conversationObject.participants = conversationObject.participants.map((participant: any) => {
      const participantObject =
        typeof participant.toObject === "function" ? participant.toObject() : participant;
      const participantId = participantObject._id?.toString();

      participantObject.isOnline =
        Boolean(participantId) && SocketService.isOnline(participantId);

      return participantObject;
    });
  }

  return conversationObject;
};

export const getOrCreateConversation = async (userId1: string, userId2: string) => {
  const participants = [userId1, userId2].sort();

  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  }).populate("participants", participantPublicFields);

  if (!conversation) {
    conversation = new Conversation({ participants });
    await conversation.save();
    await conversation.populate("participants", participantPublicFields);
  }

  return addParticipantPresence(conversation);
};

type MediaInput = {
  url: string;
  publicId: string;
  mimeType?: string;
};

export const sendMessage = async (
  senderId: string,
  recipientId: string,
  content?: string,
  media?: MediaInput
) => {
  const normalizedContent = content?.trim() ?? "";

  if (!normalizedContent && !media) {
    throw new Error("Message content or media is required");
  }

  const conversation = await getOrCreateConversation(senderId, recipientId);
  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    recipient: recipientId,
    content: normalizedContent,
    type: media ? "image" : "text",
    ...(media
      ? {
        mediaUrl: media.url,
        mediaPublicId: media.publicId,
        mediaMimeType: media.mimeType,
      }
      : {}),
  });
  // populate sender info so consumers (sockets/notifications) have user data
  await message.populate<{ sender: { _id: string; username: string; avatar?: string } }>(
    "sender",
    "username avatar"
  );
  await Conversation.findByIdAndUpdate(conversation._id, {
    lastMessage: message._id,
    lastMessageAt: new Date(),
  });
  return message;
};

export const getMessages = async (conversationId: string, queryString: Record<string, unknown>) => {
  const features = new APIFeatures(
    Message.find({
      conversation: conversationId,
      isDeleted: false,
    }),
    queryString
  )
    .sort()
    .limitFields()
    .paginate();

  return await features.query;
};

export const markMessageAsRead = async (messageId: string) => {
  return await Message.findByIdAndUpdate(messageId, {
    readAt: new Date(),
  });
};

export const getUserConversations = async (userId: string) => {
  const conversations = await Conversation.find({
    participants: userId,
  })
    .populate("participants", participantPublicFields)
    .populate("lastMessage")
    .sort({
      lastMessageAt: -1,
    });

  return conversations.map((conversation) => addParticipantPresence(conversation));
};

export const markConversationAsRead = async (conversationId: string, userId: string) => {
  await Message.updateMany(
    {
      conversation: conversationId,
      recipient: userId,
      readAt: null,
    },
    {
      readAt: new Date(),
    }
  );
};
