const { Server } = require("socket.io");
const mongoose = require("mongoose");
const Chat = require("../models/chatModel");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  const onlineUsers = new Map(); // Track userId → socket.id

  io.on("connection", (socket) => {
    console.log(` User connected: ${socket.id}`);

    // 📌 When a user joins, remove their old socket ID if present
    socket.on("joinRoom", (userId) => {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        console.error("❌ Invalid userId format");
        return;
      }

      userId = userId.toString();

      if (onlineUsers.has(userId)) {
        // Remove previous socket before updating
        const oldSocketId = onlineUsers.get(userId);
        io.sockets.sockets.get(oldSocketId)?.leave(userId);
      }

      onlineUsers.set(userId, socket.id);
      socket.join(userId);
      console.log(`📢 User ${userId} joined room.`);

      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
    });

    // 📌 Send message event
    socket.on("sendMessage", async (data) => {
      const { senderId, receiverId, message } = data;

      if (!senderId || !receiverId || !message || !message.trim()) {
        console.error("❌ Invalid message data");
        return;
      }

      try {
        const savedMessage = await Chat.create({
          senderId,
          receiverId,
          message,
          createdAt: new Date(),
        });

        console.log(` Message sent from ${senderId} to ${receiverId}`);

        //  Send only if receiver is online
        if (onlineUsers.has(receiverId)) {
          io.to(receiverId).emit("receiveMessage", savedMessage);
        }
        io.to(senderId).emit("receiveMessage", savedMessage);
      } catch (error) {
        console.error("❌ Error saving message:", error);
      }
    });

    // 📌 Mark message as read
    socket.on("markAsRead", async ({ messageId, userId }) => {
      try {
        await Chat.findByIdAndUpdate(messageId, { isRead: true });
        io.to(userId).emit("messageRead", messageId);
        console.log(` Message ${messageId} marked as read by ${userId}`);
      } catch (error) {
        console.error(" Error marking message as read:", error);
      }
    });

    // 📌 Handle user disconnect
    socket.on("disconnect", () => {
      let disconnectedUserId = null;

      for (const [userId, id] of onlineUsers.entries()) {
        if (id === socket.id) {
          onlineUsers.delete(userId);
          disconnectedUserId = userId;
          break;
        }
      }

      if (disconnectedUserId) {
        console.log(`🚪 User ${disconnectedUserId} disconnected`);
        io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      }
    });
  });

  return io;
};

module.exports = setupSocket;
