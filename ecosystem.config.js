module.exports = {
  apps: [
    {
      name: "afk-bot",

      script: "bot.js",

      autorestart: true,

      max_restarts: 999,

      restart_delay: 5000,

      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
