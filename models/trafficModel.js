const mongoose = require("mongoose");

const trafficSchema = new mongoose.Schema(
  {
    page: { type: String, required: true },
    visits: { type: Number, default: 1, min: 0 }, // Ensure visits cannot be negative
  },
  { timestamps: true }
);

const Traffic = mongoose.model("Traffic", trafficSchema);
module.exports = Traffic;
