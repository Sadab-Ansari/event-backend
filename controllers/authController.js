const User = require("../models/userModel");
const Verification = require("../models/verificationModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "Login successful!", token, user });
  } catch (error) {
    console.error("❌ Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, code } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Check if the verification code is valid
    const verification = await Verification.findOne({ email });
    if (!verification || verification.code !== code) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    user = new User({ name, email, password: hashedPassword });
    await user.save();

    // Remove verification entry after successful signup
    await Verification.deleteOne({ email });

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(201).json({ message: "Signup successful!", token, user });
  } catch (error) {
    console.error(" Signup Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  signup: exports.signup,
  login: exports.login,
};
