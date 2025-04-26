const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const userController = require("../controllers/userController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

// ✅ Ensure 'uploads/profile' folder exists
const uploadPath = path.join(__dirname, "../uploads/profile");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// ✅ Configure Multer for Profile Picture Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ✅ Get User Profile (With Organized & Participated Events)
router.get("/profile", authMiddleware, userController.getUserProfile);

// ✅ Update User Profile (Supports Profile Picture Upload)
router.put(
  "/profile",
  authMiddleware,
  upload.single("profilePic"),
  userController.updateUserProfile
);

// ✅ Remove Profile Picture (NEW ROUTE)
router.delete(
  "/profile/remove-picture",
  authMiddleware,
  userController.removeProfilePicture
);

// ✅ Get User's Participated Events
router.get("/profile/events", authMiddleware, userController.getUserEvents);

router.get("/", authMiddleware, userController.getUser);

module.exports = router;
