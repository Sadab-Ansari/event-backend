const { Server } = require("socket.io");

const setupEventMessageSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", //  Allow frontend to connect
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(" New client connected to Event Messages");

    // Handle event message emission (you can also emit from here if you want)
    socket.on("newEventMessage", (newMessage) => {
      console.log(" New Event Message:", newMessage);
      io.emit("newEventMessage", newMessage); // Emit to all connected clients
    });

    socket.on("disconnect", () => {
      console.log(" Client disconnected from Event Messages");
    });
  });

  return io;
};

module.exports = setupEventMessageSocket;
