const Replicate = require("replicate");
const Image = require("../models/imageModel");
require("dotenv").config();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

//  Generate Image using Replicate Stable Diffusion
const generateImage = async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    //  Use the correct model path for Stable Diffusion
    const output = await replicate.run(
      "stability-ai/stable-diffusion-xl:latest", // Correct model name
      {
        input: { prompt },
      }
    );

    if (!output || !output[0]) {
      return res.status(500).json({ error: "Failed to generate image" });
    }

    const imageUrl = output[0]; // Extract the generated image URL

    //  Save to MongoDB
    const newImage = new Image({ prompt, imageUrl });
    await newImage.save();

    res.json({ imageUrl });
  } catch (error) {
    console.error("❌ Image Generation Error:", error.message);
    res
      .status(500)
      .json({ error: "Failed to generate image", details: error.message });
  }
};

//  Fetch All Generated Images
const getAllImages = async (req, res) => {
  try {
    const images = await Image.find().sort({ createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch images" });
  }
};

//  Export functions
module.exports = { generateImage, getAllImages };
