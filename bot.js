require("dotenv").config();

const mineflayer = require("mineflayer");

const HOST = process.env.HOST || "localhost";
const PORT = parseInt(process.env.PORT || "25565", 10);
const USERNAME = process.env.USERNAME || "AFK_Bot";

const VERSION =
  process.env.VERSION && process.env.VERSION !== "null"
    ? process.env.VERSION
    : undefined;

const ANTI_AFK_INTERVAL = parseInt(
  process.env.ANTI_AFK_INTERVAL || "25000",
  10
);

let bot = null;
let antiAfkTimer = null;
let reconnectTimer = null;

let reconnectAttempts = 0;
let intentionalStop = false;
let connectedAt = null;

// ==========================================
// Logging
// ==========================================

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// ==========================================
// Bot State
// ==========================================

function getState() {
  return {
    status: bot && bot.entity ? "online" : "offline",

    username: USERNAME,

    host: HOST,

    port: PORT,

    health:
      bot && typeof bot.health === "number"
        ? Math.round(bot.health * 10) / 10
        : 0,

    food:
      bot && typeof bot.food === "number"
        ? bot.food
        : 0,

    position:
      bot && bot.entity && bot.entity.position
        ? {
            x: Math.round(bot.entity.position.x),
            y: Math.round(bot.entity.position.y),
            z: Math.round(bot.entity.position.z)
          }
        : null,

    uptime: connectedAt
      ? Math.floor((Date.now() - connectedAt) / 1000)
      : 0,

    reconnectAttempts
  };
}

// ==========================================
// Anti-AFK
// ==========================================

function startAntiAfk() {
  stopAntiAfk();

  antiAfkTimer = setInterval(() => {
    if (!bot || !bot.entity) {
      return;
    }

    const actions = [
      "jump",
      "sneak",
      "look",
      "walk"
    ];

    const action =
      actions[Math.floor(Math.random() * actions.length)];

    try {
      switch (action) {
        case "jump":
          bot.setControlState("jump", true);

          setTimeout(() => {
            if (bot && bot.entity) {
              bot.setControlState("jump", false);
            }
          }, 400);

          break;

        case "sneak":
          bot.setControlState("sneak", true);

          setTimeout(() => {
            if (bot && bot.entity) {
              bot.setControlState("sneak", false);
            }
          }, 800);

          break;

        case "look":
          bot.look(
            Math.random() * Math.PI * 2,
            Math.random() * 0.4 - 0.2
          );

          break;

        case "walk":
          bot.setControlState("forward", true);

          setTimeout(() => {
            if (bot && bot.entity) {
              bot.setControlState("forward", false);
            }
          }, 600);

          break;
      }

      log(`[anti-afk] ${action}`);
    } catch (error) {
      log(`[anti-afk] Error: ${error.message}`);
    }
  }, ANTI_AFK_INTERVAL);
}

function stopAntiAfk() {
  if (antiAfkTimer) {
    clearInterval(antiAfkTimer);
    antiAfkTimer = null;
  }
}

// ==========================================
// Connect
// ==========================================

function connect() {
  if (intentionalStop) {
    return;
  }

  if (bot && bot.entity) {
    log("Bot is already connected.");
    return;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  log(
    `Connecting to ${HOST}:${PORT} as ${USERNAME}...`
  );

  const options = {
    host: HOST,
    port: PORT,
    username: USERNAME
  };

  if (VERSION) {
    options.version = VERSION;
  }

  /*
   * Microsoft authentication.
   *
   * Mineflayer's Microsoft authentication can require
   * an interactive/device authentication flow.
   */
  if (process.env.AUTH_EMAIL) {
    options.auth = "microsoft";
  }

  bot = mineflayer.createBot(options);

  // ==========================================
  // Spawn
  // ==========================================

  bot.once("spawn", () => {
    reconnectAttempts = 0;
    connectedAt = Date.now();

    log("Connected and spawned.");
    log("Anti-AFK system started.");

    startAntiAfk();
  });

  // ==========================================
  // Chat
  // ==========================================

  bot.on("chat", (username, message) => {
    log(`[chat] <${username}> ${message}`);

    /*
     * Remote command:
     *
     * cmd help
     * cmd list
     * cmd time set day
     */

    if (message.startsWith("cmd ")) {
      const command = message.slice(4).trim();

      if (!command) {
        return;
      }

      const finalCommand = command.startsWith("/")
        ? command
        : `/${command}`;

      log(`[remote-command] ${username}: ${finalCommand}`);

      try {
        bot.chat(finalCommand);
      } catch (error) {
        log(
          `[remote-command] Error: ${error.message}`
        );
      }
    }
  });

  // ==========================================
  // Kicked
  // ==========================================

  bot.on("kicked", (reason) => {
    log(`[kicked] ${reason}`);
  });

  // ==========================================
  // Error
  // ==========================================

  bot.on("error", (error) => {
    log(`[error] ${error.message}`);
  });

  // ==========================================
  // Disconnect
  // ==========================================

  bot.on("end", () => {
    stopAntiAfk();

    connectedAt = null;

    log("Disconnected from server.");

    bot = null;

    if (!intentionalStop) {
      scheduleReconnect();
    }
  });
}

// ==========================================
// Reconnect
// 5s → 10s → 20s → 30s → 30s...
// ==========================================

function scheduleReconnect() {
  if (intentionalStop) {
    return;
  }

  reconnectAttempts++;

  const delays = [
    5000,
    10000,
    20000,
    30000
  ];

  const delay =
    delays[
      Math.min(
        reconnectAttempts - 1,
        delays.length - 1
      )
    ];

  log(
    `Reconnecting in ${delay / 1000}s ` +
    `(attempt ${reconnectAttempts})...`
  );

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    if (!intentionalStop) {
      connect();
    }
  }, delay);
}

// ==========================================
// Disconnect
// ==========================================

function disconnect() {
  intentionalStop = true;

  log("Shutting down bot...");

  stopAntiAfk();

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (bot) {
    try {
      bot.quit("Shutting down");
    } catch (error) {
      log(
        `Shutdown error: ${error.message}`
      );
    }

    bot = null;
  }

  log("Bot stopped.");
}

// ==========================================
// Graceful Shutdown
// ==========================================

process.on("SIGINT", () => {
  disconnect();
  process.exit(0);
});

process.on("SIGTERM", () => {
  disconnect();
  process.exit(0);
});

// ==========================================
// HTTP API
// ==========================================

try {
  require("./api.js")(
    getState,
    connect,
    disconnect,
    () => bot
  );
} catch (error) {
  log(
    `API server could not start: ${error.message}`
  );
}

// ==========================================
// Start
// ==========================================

connect();

module.exports = {
  getState,
  connect,
  disconnect
};
