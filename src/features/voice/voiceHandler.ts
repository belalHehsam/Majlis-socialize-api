import { Server, Socket } from "socket.io";
import * as voiceService from "./voiceService";
import { AppError } from "../../utils/appError";
import SocketService from "../../socket/socketService";

const voiceRoomName = (channelId: string) => voiceService.getVoiceRoomName(channelId);

/** Finds the socket id of a specific user inside a voice room (for WebRTC signaling). */
const getSocketIdInVoiceRoom = (
  io: Server,
  channelId: string,
  targetUserId: string
): string | undefined => {
  if (!channelId) return undefined;
  const roomName = voiceRoomName(channelId);
  const socketIds = io.sockets.adapter.rooms.get(roomName);
  if (!socketIds) return undefined;

  for (const socketId of socketIds) {
    const s = io.sockets.sockets.get(socketId);
    if (s && s.data.userId === targetUserId) return socketId;
  }
  return undefined;
};

export const registerVoiceHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  // ── Join ────────────────────────────────────────────────────────────────────
  socket.on("voice:join", async (channelId: string) => {
    try {
      const { channel, joined, participant } = await voiceService.joinVoiceChannel(channelId, userId);
      const room = voiceRoomName(channelId);

      socket.join(room);

      // Only notify others when the user is genuinely new to the channel.
      if (joined) {
        io.to(room).emit("voice:participantJoined", {
          channelId,
          participant: participant?.user ?? { _id: userId, username: "" },
          participantCount: channel.participantCount,
        });
      }

      // Always send the full state so the joining client is up to date.
      io.to(room).emit("voice:stateChanged", channel);
    } catch (error: any) {
      console.warn(`[voice:join] channelId=${channelId} userId=${userId}: ${error.message}`);
      socket.emit("voice:error", {
        channelId,
        message: error.message || "Failed to join voice channel",
      });
    }
  });

  // ── Leave ───────────────────────────────────────────────────────────────────
  socket.on("voice:leave", async (channelId: string) => {
    try {
      const { channel, left, ended } = await voiceService.leaveVoiceChannel(channelId, userId);
      const room = voiceRoomName(channelId);

      socket.leave(room);

      if (left) {
        io.to(room).emit("voice:participantLeft", {
          channelId,
          participantId: userId,
          participantCount: channel.participantCount,
        });
      }

      io.to(room).emit("voice:stateChanged", channel);

      if (ended) {
        io.to(room).emit("voice:channelEnded", channel);
      }
    } catch (error: any) {
      console.warn(`[voice:leave] channelId=${channelId} userId=${userId}: ${error.message}`);
      socket.emit("voice:error", {
        channelId,
        message: error.message || "Failed to leave voice channel",
      });
    }
  });

  // ── Force-end (owner / admin only) ──────────────────────────────────────────
  socket.on("voice:end", async (channelId: string) => {
    try {
      const channel = await voiceService.endVoiceChannel(
        channelId,
        userId,
        socket.data.role ?? "user"
      );
      const room = voiceRoomName(channelId);

      io.to(room).emit("voice:channelEnded", channel);
      io.to(room).emit("voice:stateChanged", channel);
    } catch (error: any) {
      console.warn(`[voice:end] channelId=${channelId} userId=${userId}: ${error.message}`);
      socket.emit("voice:error", {
        channelId,
        message: error.message || "Failed to end voice channel",
      });
    }
  });

  // ── WebRTC Signaling ─────────────────────────────────────────────────────────
  socket.on("voice:signal:offer", ({ targetUserId, channelId, sdp }) => {
    const targetSocketId =
      getSocketIdInVoiceRoom(io, channelId, targetUserId) ||
      SocketService.getSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("voice:signal:offer", { fromUserId: userId, sdp });
    }
  });

  socket.on("voice:signal:answer", ({ targetUserId, channelId, sdp }) => {
    const targetSocketId =
      getSocketIdInVoiceRoom(io, channelId, targetUserId) ||
      SocketService.getSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("voice:signal:answer", { fromUserId: userId, sdp });
    }
  });

  socket.on("voice:signal:ice", ({ targetUserId, channelId, candidate }) => {
    const targetSocketId =
      getSocketIdInVoiceRoom(io, channelId, targetUserId) ||
      SocketService.getSocketId(targetUserId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("voice:signal:ice", { fromUserId: userId, candidate });
    }
  });

  // ── Media State ──────────────────────────────────────────────────────────────
  socket.on("voice:mute", async (channelId: string, isMuted: boolean) => {
    try {
      const channel = await voiceService.updateParticipantMediaState(channelId, userId, { isMuted });
      io.to(voiceRoomName(channelId)).emit("voice:stateChanged", channel);
    } catch (err: any) {
      console.warn(`[voice:mute] channelId=${channelId} userId=${userId}: ${err.message}`);
    }
  });

  socket.on("voice:deafen", async (channelId: string, isDeafened: boolean) => {
    try {
      const channel = await voiceService.updateParticipantMediaState(channelId, userId, { isDeafened });
      io.to(voiceRoomName(channelId)).emit("voice:stateChanged", channel);
    } catch (err: any) {
      console.warn(`[voice:deafen] channelId=${channelId} userId=${userId}: ${err.message}`);
    }
  });

  // ── Auto-cleanup on disconnect ───────────────────────────────────────────────
  socket.on("disconnecting", async () => {
    const voiceRooms = [...socket.rooms].filter((room) => room.startsWith("voice:"));

    for (const room of voiceRooms) {
      const channelId = room.slice("voice:".length); // safer than replace()

      try {
        const { channel, left, ended } = await voiceService.leaveVoiceChannel(channelId, userId);

        if (left) {
          io.to(room).emit("voice:participantLeft", {
            channelId,
            participantId: userId,
            participantCount: channel.participantCount,
          });
        }

        io.to(room).emit("voice:stateChanged", channel);

        if (ended) {
          io.to(room).emit("voice:channelEnded", channel);
        }
      } catch (error) {
        // Only log truly unexpected errors; AppErrors (e.g. channel not found) are expected.
        if (!(error instanceof AppError)) {
          console.error(`[disconnecting] Failed to clean up voice room ${room}:`, error);
        }
      }
    }
  });
};
