const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  completed: { type: Number, required: true, default: 0 },
  total: { type: Number, required: true, default: 100 }, // Default total progress
  percentage: {
    type: Number,
    required: true,
    default: function () {
      return Math.round((this.completed / this.total) * 100);
    },
  },
});

// Auto-update percentage before saving
progressSchema.pre("save", function (next) {
  this.percentage = Math.round((this.completed / this.total) * 100);
  next();
});

module.exports = mongoose.model("Progress", progressSchema);
