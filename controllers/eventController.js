const fs = require("fs");
const path = require("path");
const Event = require("../models/eventModel");
const User = require("../models/userModel");
const EventMessage = require("../models/eventMessageModel");
const nodemailer = require("nodemailer");
const moment = require("moment");

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      time,
      capacity,
      interests,
      category,
    } = req.body;

    if (!title || !date || !location || !time) {
      return res
        .status(400)
        .json({ error: "Title, date, location, and time are required!" });
    }

    const formattedTime = moment(time, "HH:mm").format("hh:mm A");
    const banner = req.file ? `/uploads/${req.file.filename}` : null;

    let parsedInterests = [];
    if (typeof interests === "string") {
      try {
        const jsonParsed = JSON.parse(interests);
        if (Array.isArray(jsonParsed)) {
          parsedInterests = jsonParsed.filter((i) => i.trim() !== "");
        } else {
          parsedInterests = interests
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean);
        }
      } catch (error) {
        parsedInterests = interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean);
      }
    } else if (Array.isArray(interests)) {
      parsedInterests = interests.filter((i) => i.trim() !== "");
    }

    const newEvent = new Event({
      title,
      description,
      date,
      location,
      time: formattedTime,
      capacity: capacity || 100,
      organizer: req.user.id,
      banner,
      ...(parsedInterests.length > 0 ? { interests: parsedInterests } : {}),
      category: category || "Other",
    });

    await newEvent.save();

    //  Create EventMessage when an event is created
    const message = `${req.user.name} created the event "${newEvent.title}"`;
    const eventMessage = new EventMessage({
      userId: req.user.id,
      eventId: newEvent._id,
      message,
    });

    await eventMessage.save();

    //  Emit real-time event message
    const io = req.app.get("io");
    io.emit("newEventMessage", {
      _id: eventMessage._id,
      message: eventMessage.message,
      timestamp: eventMessage.timestamp,
      user: { name: req.user.name },
      event: { title: newEvent.title },
    });

    res
      .status(201)
      .json({ message: "Event created successfully", event: newEvent });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const registerForEvent = async (req, res) => {
  try {
    const { interests } = req.body;
    const event = await Event.findById(req.params.eventId);
    const user = await User.findById(req.user.id);

    if (!event) return res.status(404).json({ error: "Event not found" });

    const existingParticipant = event.participants.find(
      (p) => p.user.toString() === req.user.id
    );

    const userInterests =
      typeof interests === "string"
        ? interests.split(",").map((i) => i.trim())
        : interests || [];

    // Prevent re-registration
    if (existingParticipant) {
      return res
        .status(400)
        .json({ error: "You are already registered for this event." });
    }

    // Register new participant
    event.participants.push({ user: req.user.id, interests: userInterests });
    await event.save();

    // Log message
    const message = `${user.name} participated in the event "${event.title}"`;
    const newEventMessage = new EventMessage({
      userId: req.user.id,
      eventId: event._id,
      message,
    });
    await newEventMessage.save();

    // Emit real-time message
    const io = req.app.get("io");
    io.emit("newEventMessage", {
      _id: newEventMessage._id,
      message: newEventMessage.message,
      timestamp: newEventMessage.timestamp,
      user: { name: user.name },
      event: { title: event.title },
    });

    res.status(200).json({ message: "Registered successfully", event });
  } catch (error) {
    console.error("Error registering for event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getEvents = async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize to midnight

    const events = await Event.find().populate("organizer", "_id name email");

    const activeEvents = events.filter((event) => {
      const eventDateTime = new Date(event.date);
      // console.log("Raw Event Date:", event.date, "Time:", event.time); // Debugging

      const [time, period] = event.time.split(" ");
      let [hours, minutes] = time.split(":").map(Number);

      if (period === "PM" && hours !== 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      eventDateTime.setHours(hours, minutes, 0, 0); // Set event time properly
      // console.log("Final Event DateTime:", eventDateTime);

      return now <= eventDateTime; //  Allow today's events to be shown
    });

    // console.log("Filtered Events:", activeEvents); // Debugging

    res.status(200).json(activeEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId)
      .populate("organizer", "name email")
      .populate({
        path: "participants.user",
        select: "name email phone intrest",
      });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    res.status(200).json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const withdrawFromEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const participantIndex = event.participants.findIndex(
      (p) => p.user.toString() === req.user.id
    );

    if (participantIndex === -1) {
      return res
        .status(400)
        .json({ error: "You are not registered for this event." });
    }

    event.participants.splice(participantIndex, 1);
    await event.save();

    res
      .status(200)
      .json({ message: "Successfully withdrawn from event", event });
  } catch (error) {
    console.error("Error withdrawing from event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const updateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      location,
      time,
      maxParticipants,
      interests,
    } = req.body;
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    if (event.organizer.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Not authorized to update this event" });
    }
    if (req.file) {
      if (event.banner) {
        const oldBannerPath = path.join(__dirname, "..", event.banner);
        if (fs.existsSync(oldBannerPath)) {
          fs.unlinkSync(oldBannerPath);
        }
      }
      event.banner = `/uploads/${req.file.filename}`;
    }
    event.title = title;
    event.description = description;
    event.date = date;
    event.location = location;
    event.maxParticipants = maxParticipants || event.maxParticipants;
    event.interests =
      typeof interests === "string"
        ? interests.split(",").map((i) => i.trim())
        : interests || [];
    const updatedEvent = await event.save();

    res
      .status(200)
      .json({ message: "Event updated successfully", event: updatedEvent });
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });

    if (event.organizer.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await event.deleteOne();

    res
      .status(200)
      .json({ message: "Event deleted along with participants' records" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

const getNearestEventForUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const events = await Event.find({ "participants.user": userId });

    if (!events.length) {
      // console.log("No upcoming events found for user:", userId);
      return res.status(404).json({ error: "No upcoming events found." });
    }

    const upcomingEvents = events
      .map((event) => {
        const eventDateTime = new Date(event.date);
        const [time, period] = event.time.split(" ");
        let [hours, minutes] = time.split(":").map(Number);

        if (period === "PM" && hours !== 12) hours += 12;
        if (period === "AM" && hours === 12) hours = 0;

        eventDateTime.setHours(hours, minutes, 0, 0);

        return {
          ...event.toObject(),
          eventDateTime,
          banner:
            event.banner && event.banner.trim() !== ""
              ? `http://localhost:5000${event.banner}`
              : `http://localhost:5000/assets/default-placeholder.png`, // Set a valid default banner
        };
      })
      .filter((event) => event.eventDateTime > new Date())
      .sort((a, b) => a.eventDateTime - b.eventDateTime);

    if (!upcomingEvents.length) {
      // console.log("No future events found.");
      return res.status(404).json({ error: "No upcoming events found." });
    }

    res.status(200).json(upcomingEvents[0]);
  } catch (error) {
    console.error("Error fetching nearest event:", error);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createEvent,
  registerForEvent,
  getEvents,
  getEventById,
  withdrawFromEvent,
  updateEvent,
  deleteEvent,
  getNearestEventForUser,
};
