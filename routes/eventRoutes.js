const express = require("express");
const {
  createEvent,
  getEvents,
  getEventById,
  registerForEvent,
  withdrawFromEvent,
  deleteEvent,
  updateEvent,
  getNearestEventForUser, //  Import the function
} = require("../controllers/eventController");

const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

//  Configure Multer for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../uploads");
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/\s+/g, "_");
    cb(null, Date.now() + "-" + sanitizedFilename);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("banner");

//  Create Event (User can organize events & upload banner)
router.post("/create", authMiddleware, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    createEvent(req, res, next);
  });
});

//  Get All Events (Anyone can access)
router.get("/all", getEvents);

//  Get Nearest Upcoming Event (Only for logged-in users)
router.get("/nearest", authMiddleware, getNearestEventForUser);

//  Get Single Event by ID (Anyone can access)
router.get("/:eventId", getEventById);

//  Register for an Event (Only logged-in users)
router.post("/register/:eventId", authMiddleware, registerForEvent);

//  Withdraw from an Event (Only logged-in users)
router.post("/withdraw/:eventId", authMiddleware, withdrawFromEvent);

//  Allow Image Uploads in `PUT` Requests
router.put("/update/:eventId", authMiddleware, (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    updateEvent(req, res, next);
  });
});

//  Delete an Event (Only the creator or admin can delete)
router.delete("/delete/:eventId", authMiddleware, deleteEvent);

module.exports = router;
