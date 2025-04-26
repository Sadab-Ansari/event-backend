const Progress = require("../models/progressModel");

// Get User Progress
const getProgress = async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.user._id });

    if (!progress) {
      return res.status(404).json({ message: "Progress not found" });
    }

    res.status(200).json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Update User Progress
const updateProgress = async (req, res) => {
  try {
    const { completed, total } = req.body;

    let progress = await Progress.findOne({ userId: req.user._id });

    if (!progress) {
      progress = new Progress({ userId: req.user._id, completed, total });
    } else {
      progress.completed = completed;
      progress.total = total;
    }

    await progress.save();

    res.status(200).json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getProgress, updateProgress };
