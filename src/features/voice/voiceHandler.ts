import { Server, Socket } from "socket.io";
import * as voiceService from "./voiceService";
import { AppError } from "../../utils/appError";

const voiceRoomName = (channelId: string) => voiceService.getVoiceRoomName(channelId);

export const registerVoiceHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId;

  socket.on("voice:join", async (channelId: string) => {
    const { channel, joined, participant } = await voiceService.joinVoiceChannel(channelId, userId);
    const room = voiceRoomName(channelId);

    socket.join(room);

    if (joined) {
      io.to(room).emit("voice:participantJoined", {
        channelId,
        participant: participant?.user ?? {
          _id: userId,
          username: "",
        },
        participantCount: channel.participantCount,
      });
    }

    io.to(room).emit("voice:stateChanged", channel);
  });

  socket.on("voice:leave", async (channelId: string) => {
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
  });

  socket.on("voice:end", async (channelId: string) => {
    const channel = await voiceService.endVoiceChannel(
      channelId,
      userId,
      socket.data.role ?? "user"
    );
    const room = voiceRoomName(channelId);

    io.to(room).emit("voice:channelEnded", channel);
    io.to(room).emit("voice:stateChanged", channel);
  });

  socket.on("disconnecting", async () => {
    const rooms = [...socket.rooms].filter((room) => room.startsWith("voice:"));

    for (const room of rooms) {
      const channelId = room.replace("voice:", "");

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
        if (!(error instanceof AppError)) {
          console.error("Failed to clean up voice room on disconnect:", error);
        }
      }
    }
  });
};
