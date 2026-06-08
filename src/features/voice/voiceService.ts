import Category from "../../models/Category";
import VoiceChannel, { IVoiceChannel } from "../../models/voice/VoiceChannel";
import User from "../../models/User";
import { AppError } from "../../utils/appError";
import SocketService from "../../socket/socketService";
import { VoiceChannelPayload, VoiceChannelParticipantPayload } from "../../types/socketTypes";

const voiceRoomName = (channelId: string) => `voice:${channelId}`;

const asId = (value: unknown): string => {
  if (
    value &&
    typeof value === "object" &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return String(value);
};

const toParticipantPayload = (participant: any): VoiceChannelParticipantPayload => ({
  _id: asId(participant._id),
  user: {
    _id: asId(participant.user._id ?? participant.user),
    username: participant.user.username,
    avatar: participant.user.avatar,
  },
  joinedAt: participant.joinedAt,
  isMuted: participant.isMuted,
  isDeafened: participant.isDeafened,
});

const toChannelPayload = (
  channel: IVoiceChannel & { category?: any; createdBy?: any; participants?: any[] }
): VoiceChannelPayload => ({
  _id: asId(channel._id),
  title: channel.title,
  category: {
    _id: asId(channel.category?._id ?? channel.category),
    name: channel.category?.name,
    slug: channel.category?.slug,
  },
  createdBy: {
    _id: asId(channel.createdBy?._id ?? channel.createdBy),
    username: channel.createdBy?.username,
    avatar: channel.createdBy?.avatar,
  },
  participants: (channel.participants ?? []).map(toParticipantPayload),
  status: channel.status,
  endedAt: channel.endedAt ?? null,
  createdAt: channel.createdAt,
  updatedAt: channel.updatedAt,
  participantCount: channel.participants?.length ?? 0,
});

const populateChannel = (query: any) => {
  return query
    .populate("category", "name slug")
    .populate("createdBy", "username avatar")
    .populate("participants.user", "username avatar");
};

const populateChannelById = (channelId: string): Promise<any> =>
  populateChannel(VoiceChannel.findById(channelId));

const loadChannelOrFail = async (channelId: string): Promise<any> => {
  const channel = await populateChannel(VoiceChannel.findById(channelId));

  if (!channel) {
    throw new AppError("Voice channel not found", 404);
  }

  return channel;
};

const ensureActiveChannel = (channel: any) => {
  if (channel.status === "ended") {
    throw new AppError("Voice channel has ended", 400);
  }
};

const hasParticipant = (channel: any, userId: string) =>
  channel.participants.some((participant: any) => asId(participant.user) === userId);

const removeParticipant = (channel: any, userId: string) => {
  const nextParticipants = channel.participants.filter(
    (participant: any) => asId(participant.user) !== userId
  );
  const changed = nextParticipants.length !== channel.participants.length;
  channel.participants = nextParticipants;

  return changed;
};

export const getVoiceRoomName = voiceRoomName;

export const createVoiceChannel = async (userId: string, title: string, categoryId: string) => {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const creator = await User.findById(userId).select("username avatar");
  if (!creator) {
    throw new AppError("User not found", 404);
  }

  const channel = await VoiceChannel.create({
    title: title.trim(),
    category: category._id,
    createdBy: creator._id,
    participants: [{ user: creator._id }],
  });

  const populated = await populateChannelById(channel._id.toString());
  return toChannelPayload(populated as any);
};

export const listVoiceChannels = async (filters?: { categoryId?: string }) => {
  const query = VoiceChannel.find({
    status: "active",
    ...(filters?.categoryId ? { category: filters.categoryId } : {}),
  })
    .sort({ createdAt: -1 })
    .populate("category", "name slug")
    .populate("createdBy", "username avatar")
    .populate("participants.user", "username avatar");

  const channels = await query;
  return channels.map((channel) => toChannelPayload(channel as any));
};

export const getVoiceChannelById = async (channelId: string) => {
  const channel = await loadChannelOrFail(channelId);
  return toChannelPayload(channel as any);
};

export const joinVoiceChannel = async (channelId: string, userId: string) => {
  const channel = await loadChannelOrFail(channelId);
  ensureActiveChannel(channel);

  const participantAlreadyExists = hasParticipant(channel, userId);

  if (!participantAlreadyExists) {
    channel.participants.push({ user: userId as any });
    await channel.save();
  }

  const populated = await populateChannelById(channelId);
  const participant = (populated as any).participants.find(
    (item: any) => asId(item.user?._id ?? item.user) === userId
  );

  return {
    channel: toChannelPayload(populated as any),
    joined: !participantAlreadyExists,
    participant: participant ? toParticipantPayload(participant) : undefined,
  };
};

export const leaveVoiceChannel = async (channelId: string, userId: string) => {
  const channel = await loadChannelOrFail(channelId);

  if (channel.status === "ended") {
    return {
      channel: toChannelPayload(channel as any),
      left: false,
      ended: true,
    };
  }

  const left = removeParticipant(channel, userId);

  if (left) {
    if (channel.participants.length === 0) {
      channel.status = "ended";
      channel.endedAt = new Date();
    }

    await channel.save();
  }

  const populated = await populateChannelById(channelId);
  return {
    channel: toChannelPayload(populated as any),
    left,
    ended: populated.status === "ended",
  };
};

export const endVoiceChannel = async (channelId: string, userId: string, role: string) => {
  const channel = await loadChannelOrFail(channelId);

  const isOwner = asId(channel.createdBy) === userId;
  const isAdmin = role === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError("Only the channel owner or an admin can end this channel", 403);
  }

  if (channel.status !== "ended") {
    channel.status = "ended";
    channel.endedAt = new Date();
    await channel.save();
  }

  const populated = await loadChannelOrFail(channelId);
  return toChannelPayload(populated as any);
};

export const emitVoiceChannelState = (channel: VoiceChannelPayload) => {
  SocketService.emitToRoom("voice:stateChanged", voiceRoomName(channel._id), channel);
};

export const emitVoiceChannelEnded = (channel: VoiceChannelPayload) => {
  SocketService.emitToRoom("voice:channelEnded", voiceRoomName(channel._id), channel);
};
