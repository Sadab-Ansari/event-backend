const express = require("express");
const mongoose = require("mongoose");
const {
  sendMessage,
  getMessages,
  getChatList,
} = require("../controllers/chatController");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const router = express.Router();

// 📌 Middleware to validate MongoDB ObjectIds
const validateObjectIds = (req, res, next) => {
  let { senderId, receiverId } = req.method === "POST" ? req.body : req.params;

  if (
    !mongoose.Types.ObjectId.isValid(senderId) ||
    !mongoose.Types.ObjectId.isValid(receiverId)
  ) {
    return res.status(400).json({ error: "Invalid senderId or receiverId" });
  }
  next();
};

//  Route to get receiverIds of users who have chatted with the given user
router.get("/getReceiverId/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const chatUsers = await Chat.aggregate([
      {
        $match: {
          $or: [
            { senderId: new mongoose.Types.ObjectId(userId) },
            { receiverId: new mongoose.Types.ObjectId(userId) },
          ],
        },
      },
      {
        $group: {
          _id: null,
          userIds: { $addToSet: "$senderId" },
          otherUserIds: { $addToSet: "$receiverId" },
        },
      },
      {
        $project: {
          _id: 0,
          receiverIds: { $setUnion: ["$userIds", "$otherUserIds"] },
        },
      },
    ]);

    if (!chatUsers.length || !chatUsers[0].receiverIds.includes(userId)) {
      return res.status(404).json({ error: "No chat history found" });
    }

    return res.status(200).json({
      receiverIds: chatUsers[0].receiverIds.filter((id) => id !== userId),
    });
  } catch (error) {
    console.error("❌ Error fetching receiver IDs:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

//  Route to send a message
router.post("/send", validateObjectIds, async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message cannot be empty" });
    }

    await sendMessage(req, res, next);
  } catch (error) {
    next(error);
  }
});

//  Route to get messages between two users
router.get("/:senderId/:receiverId", validateObjectIds, getMessages);

//  Route to get all conversations for a user with unique chat partners
router.get("/conversations/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const conversations = await Chat.aggregate([
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
            participants: {
              $cond: [
                { $eq: ["$senderId", new mongoose.Types.ObjectId(userId)] },
                "$receiverId",
                "$senderId",
              ],
            },
          },
          lastMessage: { $first: "$message" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    const userIds = conversations.map((conv) => conv._id.participants);

    const users = await User.find({ _id: { $in: userIds } }).select(
      "name email"
    );

    const populatedConversations = conversations.map((conv) => ({
      user: users.find(
        (user) => user._id.toString() === conv._id.participants.toString()
      ),
      lastMessage: conv.lastMessage,
      updatedAt: conv.updatedAt,
    }));

    res.status(200).json(populatedConversations);
  } catch (error) {
    console.error("❌ Error in conversations route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//  Route to get chat list for a user
router.get("/chatlist/:userId", async (req, res) => {
  try {
    await getChatList(req, res);
  } catch (error) {
    console.error("❌ Error fetching chat list:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
