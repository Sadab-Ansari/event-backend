const mongoose = require("mongoose");

const eventMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Event",
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// ✅ Optimized Indexing for faster queries (fetching messages for an event)
eventMessageSchema.index({ eventId: 1, timestamp: -1 });

// ✅ Add a pre-query middleware to auto-populate user & event details (optional)
eventMessageSchema.pre(/^find/, function (next) {
  this.populate("userId", "name").populate("eventId", "title");
  next();
});

const EventMessage = mongoose.model("eventMessage", eventMessageSchema);
module.exports = EventMessage;
