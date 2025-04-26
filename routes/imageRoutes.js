const express = require("express");
const {
  generateImage,
  getAllImages,
} = require("../controllers/imageController");

const router = express.Router();

router.post("/generate", generateImage);
router.get("/images", getAllImages); //  Ensure getAllImages is correctly referenced

module.exports = router;
