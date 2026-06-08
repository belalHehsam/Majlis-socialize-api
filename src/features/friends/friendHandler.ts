import { AppSocket, FriendAcceptedPayload, FriendRequestPayload } from "../../types/socketTypes";

// import SocketService from "../../socket/socketService";

export const registerFriendHandlers = (socket: AppSocket): void => {
};

// export const emitFriendRequest = (recipientId: string, payload: FriendRequestPayload): void => {
//   // const socketId = SocketService.getUserSocketId(recipientId);
//   // if (!socketId) return;

//   SocketService.sendFriendRequest(recipientId, payload);
// };

// export const emitFriendAccepted = (requesterId: string,payload: FriendAcceptedPayload): void => {
//   // const socketId = SocketService.getUserSocketId(requesterId);

//   // if (!socketId) return;

//   SocketService.sendFriendAccepted(
//     requesterId,
//     payload
//   );
// };
