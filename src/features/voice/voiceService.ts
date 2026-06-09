import Category from "../../models/Category";
import VoiceChannel, { IVoiceChannel } from "../../models/voice/VoiceChannel";
import User from "../../models/User";
import { AppError } from "../../utils/appError";
import { VoiceChannelPayload, VoiceChannelParticipantPayload } from "../../types/socketTypes";

const voiceRoomName = (channelId: string) => `voice:${channelId}`;

/** Safely converts any Mongoose ObjectId / populated sub-document to a plain string id. */
const asId = (value: unknown): string => {
  if (!value) return "";
  if (typeof value === "object") {
    if ("_id" in value && (value as any)._id) return String((value as any)._id);
    if ("toString" in value && typeof (value as any).toString === "function") {
      const str = (value as any).toString();
      if (str !== "[object Object]") return str;
    }
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

/** Runs populate on any VoiceChannel query (findById, findOneAndUpdate, etc.). */
const populateChannel = (query: any) =>
  query
    .populate("category", "name slug")
    .populate("createdBy", "username avatar")
    .populate("participants.user", "username avatar");

const loadChannelOrFail = async (channelId: string): Promise<any> => {
  const channel = await populateChannel(VoiceChannel.findById(channelId));
  if (!channel) throw new AppError("Voice channel not found", 404);
  return channel;
};

// ─── Public API ──────────────────────────────────────────────────────────────

export const getVoiceRoomName = voiceRoomName;

export const createVoiceChannel = async (userId: string, title: string, categoryId: string) => {
  const category = await Category.findById(categoryId);
  if (!category) throw new AppError("Category not found", 404);

  const creator = await User.findById(userId).select("username avatar");
  if (!creator) throw new AppError("User not found", 404);

  const channel = await VoiceChannel.create({
    title: title.trim(),
    category: category._id,
    createdBy: creator._id,
    participants: [{ user: creator._id }],
  });

  const populated = await populateChannel(VoiceChannel.findById(channel._id));
  return toChannelPayload(populated as any);
};

export const listVoiceChannels = async (filters?: { categoryId?: string }) => {
  const channels = await VoiceChannel.find({
    status: "active",
    ...(filters?.categoryId ? { category: filters.categoryId } : {}),
  })
    .sort({ createdAt: -1 })
    .populate("category", "name slug")
    .populate("createdBy", "username avatar")
    .populate("participants.user", "username avatar");

  return channels.map((channel) => toChannelPayload(channel as any));
};

export const getVoiceChannelById = async (channelId: string) => {
  const channel = await loadChannelOrFail(channelId);
  return toChannelPayload(channel as any);
};

/**
 * Atomically adds the user to the participants list only if:
 *   - the channel is active
 *   - the user is not already in the list
 *
 * Returns the updated channel, whether the user was newly added, and their participant entry.
 */
export const joinVoiceChannel = async (channelId: string, userId: string) => {
  // Atomic: push only when the user is not already there AND the channel is active.
  const updated = await populateChannel(
    VoiceChannel.findOneAndUpdate(
      { _id: channelId, status: "active", "participants.user": { $ne: userId } },
      { $push: { participants: { user: userId } } },
      { new: true }
    )
  );

  if (updated) {
    // User was successfully added — find their entry to return it.
    const participant = updated.participants.find(
      (item: any) => asId(item.user?._id ?? item.user) === userId
    );
    return {
      channel: toChannelPayload(updated as any),
      joined: true,
      participant: participant ? toParticipantPayload(participant) : undefined,
    };
  }

  // The update matched nothing — either already a participant, or channel ended/missing.
  const channel = await populateChannel(VoiceChannel.findById(channelId));
  if (!channel) throw new AppError("Voice channel not found", 404);
  if (channel.status === "ended") throw new AppError("Voice channel has ended", 400);

  // User was already a participant — return their existing entry.
  const participant = channel.participants.find(
    (item: any) => asId(item.user?._id ?? item.user) === userId
  );
  return {
    channel: toChannelPayload(channel as any),
    joined: false,
    participant: participant ? toParticipantPayload(participant) : undefined,
  };
};

/**
 * Atomically removes the user from the channel.
 * If they were the last participant, also marks the channel as ended.
 */
export const leaveVoiceChannel = async (channelId: string, userId: string) => {
  // Read first to know participant count (needed to decide whether to end).
  const current = await VoiceChannel.findById(channelId).lean();
  if (!current) throw new AppError("Voice channel not found", 404);

  if (current.status === "ended") {
    const populated = await loadChannelOrFail(channelId);
    return { channel: toChannelPayload(populated as any), left: false, ended: true };
  }

  const isParticipant = current.participants.some((p) => asId(p.user) === userId);
  if (!isParticipant) {
    const populated = await loadChannelOrFail(channelId);
    return { channel: toChannelPayload(populated as any), left: false, ended: false };
  }

  const isLast = current.participants.length === 1;

  const updateOp = isLast
    ? { $pull: { participants: { user: userId } }, $set: { status: "ended", endedAt: new Date() } }
    : { $pull: { participants: { user: userId } } };

  const updated = await populateChannel(
    VoiceChannel.findOneAndUpdate({ _id: channelId, status: "active" }, updateOp, { new: true })
  );

  const finalChannel = updated ?? (await loadChannelOrFail(channelId));
  return {
    channel: toChannelPayload(finalChannel as any),
    left: true,
    ended: finalChannel.status === "ended",
  };
};

/**
 * Marks a voice channel as ended. Only the owner or an admin can do this.
 */
export const endVoiceChannel = async (channelId: string, userId: string, role: string) => {
  const channel = await loadChannelOrFail(channelId);

  const isOwner = asId(channel.createdBy?._id ?? channel.createdBy) === userId;
  const isAdmin = role === "admin";
  if (!isOwner && !isAdmin) {
    throw new AppError("Only the channel owner or an admin can end this channel", 403);
  }

  if (channel.status === "ended") {
    return toChannelPayload(channel as any);
  }

  const updated = await populateChannel(
    VoiceChannel.findOneAndUpdate(
      { _id: channelId, status: "active" },
      { $set: { status: "ended", endedAt: new Date() } },
      { new: true }
    )
  );

  return toChannelPayload((updated ?? channel) as any);
};

/**
 * Updates the mute / deafen state for a specific participant.
 * Deafening a participant automatically mutes them.
 */
export const updateParticipantMediaState = async (
  channelId: string,
  userId: string,
  mediaState: { isMuted?: boolean; isDeafened?: boolean }
) => {
  const updateFields: Record<string, boolean> = {};
  if (mediaState.isMuted !== undefined) {
    updateFields["participants.$.isMuted"] = mediaState.isMuted;
  }
  if (mediaState.isDeafened !== undefined) {
    updateFields["participants.$.isDeafened"] = mediaState.isDeafened;
    if (mediaState.isDeafened) updateFields["participants.$.isMuted"] = true;
  }

  const updated = await populateChannel(
    VoiceChannel.findOneAndUpdate(
      { _id: channelId, status: "active", "participants.user": userId },
      { $set: updateFields },
      { new: true }
    )
  );

  if (!updated) {
    const channel = await VoiceChannel.findById(channelId);
    if (!channel) throw new AppError("Voice channel not found", 404);
    if (channel.status === "ended") throw new AppError("Voice channel has ended", 400);
    throw new AppError("Participant not found in this channel", 404);
  }

  return toChannelPayload(updated as any);
};

export const listCategories = async () => Category.find().sort({ name: 1 });
