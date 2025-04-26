const mongoose = require("mongoose");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

// Send a message
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message } = req.body;
    const io = req.app.get("io");

    if (!senderId || !receiverId || !message.trim()) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({ error: "Invalid senderId or receiverId" });
    }

    const senderExists = await User.findById(senderId);
    const receiverExists = await User.findById(receiverId);

    if (!senderExists || !receiverExists) {
      return res.status(404).json({ error: "Sender or receiver not found" });
    }

    const newMessage = new Chat({
      senderId,
      receiverId,
      message: message.trim(),
    });

    await newMessage.save();
    await newMessage.populate("senderId", "name email");
    await newMessage.populate("receiverId", "name email");

    if (io) {
      io.to(senderId.toString()).emit("receiveMessage", newMessage);
      if (senderId.toString() !== receiverId.toString()) {
        io.to(receiverId.toString()).emit("receiveMessage", newMessage);
      }
    }

    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get messages between two users
const getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ error: "Both senderId and receiverId are required" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !mongoose.Types.ObjectId.isValid(receiverId)
    ) {
      return res.status(400).json({ error: "Invalid senderId or receiverId" });
    }

    const messages = await Chat.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    })
      .populate("senderId", "name email")
      .populate("receiverId", "name email")
      .sort({ createdAt: 1 });

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get latest chat for each user
const getChatList = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const chatList = await Chat.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            senderId: "$senderId",
            receiverId: "$receiverId",
          },
          latestMessage: { $first: "$message" },
          timestamp: { $first: "$createdAt" },
        },
      },
      { $sort: { timestamp: -1 } },
    ]);

    res.status(200).json(chatList);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { sendMessage, getMessages, getChatList };
