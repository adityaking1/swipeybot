import { Server, Socket } from "socket.io";
import { logger } from "../lib/logger.js";

interface WaitingUser {
  socket: Socket;
  name: string;
  gender: string;
}

const waitingQueue: WaitingUser[] = [];
const rooms = new Map<string, { user1: Socket; user2: Socket }>();

function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function cleanup(socket: Socket) {
  const idx = waitingQueue.findIndex((u) => u.socket.id === socket.id);
  if (idx !== -1) {
    waitingQueue.splice(idx, 1);
    logger.info({ socketId: socket.id }, "Removed from waiting queue");
  }

  const roomId = socket.data.roomId as string | undefined;
  if (roomId) {
    socket.to(roomId).emit("partner_disconnected");
    rooms.delete(roomId);
    socket.data.roomId = undefined;
    logger.info({ roomId }, "Room closed");
  }
}

export function setupRandomChat(io: Server) {
  io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join_queue", ({ name, gender }: { name: string; gender: string }) => {
      if (!name || !gender) return;

      const alreadyWaiting = waitingQueue.some((u) => u.socket.id === socket.id);
      if (alreadyWaiting || socket.data.roomId) return;

      socket.data.name = name;
      socket.data.gender = gender;

      if (waitingQueue.length > 0) {
        const partner = waitingQueue.shift()!;
        const roomId = generateRoomId();

        rooms.set(roomId, { user1: partner.socket, user2: socket });

        partner.socket.data.roomId = roomId;
        socket.data.roomId = roomId;

        partner.socket.join(roomId);
        socket.join(roomId);

        partner.socket.emit("matched", {
          roomId,
          partnerName: name,
          partnerGender: gender,
        });
        socket.emit("matched", {
          roomId,
          partnerName: partner.name,
          partnerGender: partner.gender,
        });

        logger.info({ roomId, user1: partner.name, user2: name }, "Users paired");
      } else {
        waitingQueue.push({ socket, name, gender });
        socket.emit("waiting");
        logger.info({ name }, "Added to waiting queue");
      }
    });

    socket.on("send_message", ({ roomId, message }: { roomId: string; message: string }) => {
      if (!message?.trim() || socket.data.roomId !== roomId) return;
      socket.to(roomId).emit("receive_message", {
        message: message.trim(),
        senderName: socket.data.name,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("leave_chat", () => {
      cleanup(socket);
      socket.emit("left");
    });

    socket.on("disconnect", () => {
      cleanup(socket);
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });
}
