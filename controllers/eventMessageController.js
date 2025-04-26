const EventMessage = require("../models/eventMessageModel");
const User = require("../models/userModel");
const Event = require("../models/eventModel");
const mongoose = require("mongoose");

//  Controller to create an event message & emit it in real-time
const createEventMessage = async (req, res) => {
  try {
    console.log(" Incoming request body:", req.body); //  Debugging log

    let { userId, eventId, actionType } = req.body; // Accept actionType
    const io = req.app.get("io"); //  Get the socket instance from Express

    if (!userId || !eventId || !actionType) {
      return res.status(400).json({
        success: false,
        error: "User ID, Event ID, and Action Type are required.",
      });
    }

    //  Convert to ObjectId if needed
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(eventId)
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid User ID or Event ID format." });
    }

    userId = new mongoose.Types.ObjectId(userId);
    eventId = new mongoose.Types.ObjectId(eventId);

    //  Check if user & event exist
    const user = await User.findById(userId);
    const event = await Event.findById(eventId);

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    if (!event) {
      return res
        .status(404)
        .json({ success: false, error: "Event not found." });
    }

    //  Construct message based on actionType
    let message;
    if (actionType === "create") {
      message = `${user.name} created the event "${event.title}"`;
    } else if (actionType === "participate") {
      message = `${user.name} participated in the event "${event.title}"`;
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid actionType. Must be 'create' or 'participate'.",
      });
    }

    //  Create and save the event message
    const newMessage = new EventMessage({ userId, eventId, message });
    await newMessage.save();

    //  Check if saved successfully
    const savedMessage = await EventMessage.findById(newMessage._id);
    if (!savedMessage) {
      console.error("❌ Failed to save event message in DB.");
      return res.status(500).json({
        success: false,
        error: "Database error: Failed to save event message.",
      });
    }

    console.log(" Event message created:", savedMessage);

    //  Emit real-time message to all connected users
    io.emit("newEventMessage", {
      _id: savedMessage._id,
      message: savedMessage.message,
      timestamp: savedMessage.timestamp,
      user: { name: user.name },
      event: { title: event.title },
    });

    res.status(201).json({
      success: true,
      message: "Event message created successfully.",
      eventMessage: savedMessage,
    });
  } catch (error) {
    console.error("❌ Error creating event message:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

//  Controller to get all event messages with expiration filter
const getAllEventMessages = async (req, res) => {
  try {
    const currentTime = new Date();
    const expirationTime = new Date(currentTime - 24 * 60 * 60 * 1000); // 24 hours ago

    // Retrieve messages and filter out those older than 24 hours
    const messages = await EventMessage.find({
      timestamp: { $gte: expirationTime }, // Only retrieve messages within the last 24 hours
    })
      .populate("userId", "name") // Populate user name
      .populate("eventId", "title") // Populate event title
      .sort({ timestamp: -1 }) // Show newest messages first
      .lean();

    if (!messages.length) {
      return res.status(200).json({ success: true, messages: [] }); //  Return empty array with 200 status
    }

    console.log(` Retrieved ${messages.length} event messages.`);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("❌ Error fetching all event messages:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = { createEventMessage, getAllEventMessages };
