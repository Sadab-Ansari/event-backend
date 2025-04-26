const Event = require("../models/eventModel");
const moment = require("moment");

const setupCountdownSocket = (io) => {
  console.log(" Countdown socket initialized");

  io.on("connection", async (socket) => {
    console.log(" User connected to countdown socket");

    // Function to emit countdown for the nearest event
    const emitNearestEventCountdown = async (userId) => {
      try {
        // Find the nearest upcoming event that the user has joined
        const now = moment();
        const upcomingEvent = await Event.findOne({
          "participants.user": userId,
          date: { $gte: now.format("YYYY-MM-DD") }, // Future events
        })
          .sort({ date: 1, time: 1 }) // Get the nearest event
          .lean();

        if (!upcomingEvent) {
          socket.emit("countdownUpdate", { event: null });
          return;
        }

        const eventDateTime = moment(
          `${upcomingEvent.date} ${upcomingEvent.time}`,
          "YYYY-MM-DD hh:mm A"
        );
        const timeDiff = eventDateTime.diff(now, "seconds");

        if (timeDiff <= 0) {
          // Mark event as in progress if the time has passed
          socket.emit("countdownUpdate", {
            event: upcomingEvent,
            status: "In Progress",
            timeRemaining: 0,
          });
        } else if (timeDiff <= 3600) {
          // If event starts in <= 1 hour, start countdown
          socket.emit("countdownUpdate", {
            event: upcomingEvent,
            status: "Starting Soon",
            timeRemaining: timeDiff,
          });
        }
      } catch (error) {
        console.error(" Error fetching nearest event:", error);
      }
    };

    // Listen for user joining countdown updates
    socket.on("joinCountdown", async (userId) => {
      console.log(` User ${userId} joined countdown updates`);
      await emitNearestEventCountdown(userId);
    });

    socket.on("disconnect", () => {
      console.log(" User disconnected from countdown socket");
    });
  });
};

module.exports = setupCountdownSocket;
