# Minecraft AFK Bot

A lightweight 24/7 Minecraft AFK bot built with Mineflayer.

It includes:

- Anti-AFK movement
- Automatic reconnection
- Exponential reconnect backoff
- In-game remote commands
- Chat logging
- HTTP control API
- PM2 24/7 support
- Graceful shutdown


## Features

### Anti-AFK

The bot performs a random action approximately every 25 seconds:

- Jump
- Sneak
- Look around
- Walk forward

The action is printed to the console.


### Auto-Reconnect

If the bot gets disconnected, kicked, or encounters a connection problem, it automatically reconnects.

Reconnect delays:

```text
5 seconds
10 seconds
20 seconds
30 seconds
30 seconds
30 seconds...
