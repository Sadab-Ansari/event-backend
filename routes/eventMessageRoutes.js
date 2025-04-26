const express = require("express");
const {
  createEventMessage,
  getAllEventMessages,
} = require("../controllers/eventMessageController");

const router = express.Router();

//  Route to create an event message
router.post("/messages", createEventMessage);

//  Route to get all event messages
router.get("/all", getAllEventMessages);

module.exports = router;
