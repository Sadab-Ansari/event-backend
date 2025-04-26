const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 300 }, // Code expires in 5 min
});

module.exports = mongoose.model("Verification", verificationSchema);
