import Conversation from "../../models/chat/Conversation";
import Message from "../../models/chat/Message";
import APIFeatures from "../../utils/apiFeatures";
export const getOrCreateConversation = async (userId1: string, userId2: string) => {
  const participants = [userId1, userId2].sort();
  let conversation = await Conversation.findOne({
    participants: { $all: participants, $size: 2 },
  });
  if (!conversation) {
    conversation = new Conversation({ participants });
    await conversation.save();
  }
  return conversation;
};

export const sendMessage = async (senderId: string, recipientId: string, content: string) => {
  if (!content.trim()) {
    throw new Error("Message content cannot be empty");
  }
  const conversation = await getOrCreateConversation(senderId, recipientId);
  const message = await Message.create({
    conversation: conversation._id,
    sender: senderId,
    content,
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
  return Conversation.find({
    participants: userId,
  })
    .populate("participants", "name profileImage")
    .populate("lastMessage")
    .sort({
      lastMessageAt: -1,
    });
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
