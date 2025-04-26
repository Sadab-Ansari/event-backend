const Traffic = require("../models/trafficModel");
const { validateTrafficData } = require("../utils/validation"); // Added validation utility

// ✅ Log traffic when a page is visited
const logTraffic = async (req, res) => {
  console.log("Incoming request body:", req.body); // Log incoming request

  const validationError = validateTrafficData(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const { page } = req.body;

    if (!page) {
      return res.status(400).json({ message: "Page name is required" });
    }

    let trafficEntry = await Traffic.findOne({ page });
    console.log("Traffic entry found:", trafficEntry); // Log found entry

    if (trafficEntry) {
      trafficEntry.visits += 1;
      await trafficEntry.save();
    } else {
      trafficEntry = await Traffic.create({ page });
      console.log("New traffic entry created:", trafficEntry); // Log created entry
    }

    res
      .status(200)
      .json({ message: "Traffic logged successfully", trafficEntry });
  } catch (error) {
    console.error("Error logging traffic:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Get traffic data for frontend visualization
const getTrafficData = async (req, res) => {
  try {
    const trafficData = await Traffic.find().sort({ visits: -1 }).limit(10);

    if (!trafficData || trafficData.length === 0) {
      return res.status(200).json([]); // Return empty array instead of throwing an error
    }

    // Map visits to traffic for frontend compatibility
    const formattedData = trafficData.map((item) => ({
      name: item.page,
      traffic: item.visits,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    console.error("Error fetching traffic data:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { logTraffic, getTrafficData };
