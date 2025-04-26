const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const verificationModel = require("../models/verificationModel");

// ✅ Fix: Importing functions correctly
const { signup, login } = require("../controllers/authController");

const router = express.Router();

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send verification code route
router.post("/send-code", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save verification code to database
    await verificationModel.findOneAndUpdate(
      { email },
      { code, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    // Send email with verification code
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Verification Code",
      text: `Your verification code is: ${code}`,
    });

    res.json({ message: "Verification code sent successfully" });
  } catch (error) {
    console.error("Error sending verification code:", error);
    res
      .status(500)
      .json({
        message: "Failed to send verification code",
        error: error.message,
      });
  }
});

// ✅ Fix: Define routes correctly
router.post("/signup", signup); // 🔥 No more "undefined" error
router.post("/login", login);

// ✅ Google Login Route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// ✅ Google Callback Route
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:3000/login",
  }),
  (req, res) => {
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.redirect(`http://localhost:3000/dashboard?token=${token}`);
  }
);

module.exports = router;
