const express = require("express");
const router = express.Router();
const {
  logTraffic,
  getTrafficData,
} = require("../controllers/trafficController"); // Ensure correct import

//  Route to log website traffic
router.post("/log", logTraffic); // Route to log website traffic

//  Route to fetch traffic data
router.get("/data", getTrafficData); // Route to fetch traffic data

module.exports = router;
