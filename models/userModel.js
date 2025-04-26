const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return this.googleId ? false : true;
      },
    },

    googleId: { type: String, index: true }, //  Use index instead of unique to avoid conflicts
    phone: { type: String, default: "" },
    profilePic: { type: String, default: "/default-profile.jpg" }, //  Ensure it exists
  },
  { timestamps: true }
); //  Adds createdAt & updatedAt

module.exports = mongoose.model("User", UserSchema);
