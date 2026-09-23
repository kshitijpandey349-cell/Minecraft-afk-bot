require("dotenv").config();

const express = require("express");
const cors = require("cors");

module.exports = function (
  getState,
  connect,
  disconnect,
  getBot
) {
  const app = express();

  const PORT = parseInt(
    process.env.API_PORT || "3000",
    10
  );

  const SECRET = process.env.API_SECRET || "";

  app.use(cors());

  app.use(express.json());

  // ==========================================
  // API Authentication
  // ==========================================

  app.use((req, res, next) => {
    if (!SECRET) {
      return next();
    }

    const token =
      req.headers["x-api-secret"] ||
      req.query.secret;

    if (token !== SECRET) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    next();
  });

  // ==========================================
  // Status
  // ==========================================

  app.get("/status", (req, res) => {
    res.json(getState());
  });

  // ==========================================
  // Start
  // ==========================================

  app.post("/start", (req, res) => {
    connect();

    res.json({
      ok: true,
      message: "Connecting..."
    });
  });

  // ==========================================
  // Stop
  // ==========================================

  app.post("/stop", (req, res) => {
    disconnect();

    res.json({
      ok: true,
      message: "Disconnected."
    });
  });

  // ==========================================
  // Send Chat
  // ==========================================

  app.post("/chat", (req, res) => {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "message required"
      });
    }

    const bot = getBot();

    if (!bot || !bot.entity) {
      return res.status(503).json({
        error: "Bot not online"
      });
    }

    bot.chat(String(message));

    res.json({
      ok: true
    });
  });

  // ==========================================
  // Run Server Command
  // ==========================================

  app.post("/command", (req, res) => {
    const { command } = req.body;

    if (!command) {
      return res.status(400).json({
        error: "command required"
      });
    }

    const bot = getBot();

    if (!bot || !bot.entity) {
      return res.status(503).json({
        error: "Bot not online"
      });
    }

    const commandString = String(command);

    const finalCommand =
      commandString.startsWith("/")
        ? commandString
        : `/${commandString}`;

    bot.chat(finalCommand);

    res.json({
      ok: true,
      command: finalCommand
    });
  });

  // ==========================================
  // Start API
  // ==========================================

  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `[api] Control API listening on port ${PORT}`
    );
  });
};
