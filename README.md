# WebSocket Client Manager

A Node.js application that manages multiple WebSocket clients for testing the Python WebSocket server.

## Features

- Creates and manages multiple WebSocket clients
- Sends random messages with different types (text, voice, video)
- Handles client connections and disconnections
- Configurable number of clients and messages
- Logs all activities to console and file

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env` file:
```env
# Server Configuration
SERVER_URL=http://localhost:8080
SERVER_PATH=/socket.io/

# Client Manager Configuration
MAX_CLIENTS=100
MAX_MESSAGES_PER_CLIENT=20
MAX_CONCURRENT_MESSAGES=30

# Message Configuration
MESSAGE_TYPES=["text", "voice", "video"]
MIN_MESSAGE_DELAY=1000  # ms
MAX_MESSAGE_DELAY=5000  # ms
```

## Usage

Start the client manager:
```bash
npm start
```

The client manager will:
1. Create initial clients (up to MAX_CLIENTS)
2. Send random messages from random clients
3. Wait for responses
4. Continue until all clients reach their message limit
5. Disconnect all clients and exit

## Logging

Logs are written to both console and `client-manager.log` file. The log includes:
- Client connections and disconnections
- Message sending and receiving
- Errors and exceptions
- Summary statistics 