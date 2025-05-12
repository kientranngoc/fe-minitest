import { io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'client-manager.log' })
  ]
});

class Client {
  constructor(id, timezone = 'UTC') {
    this.id = id;
    this.timezone = timezone;
    this.socket = null;
    this.messageCount = 0;
    this.pendingReplies = new Set();
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(process.env.SERVER_URL, {
        path: '/socket.io/',
        transports: ['websocket'],
        auth: {
          id: this.id,
          timezone: this.timezone
        },
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        logger.info(`Client ${this.id} connected`);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        logger.error(`Client ${this.id} connection error:`, error);
        reject(error);
      });

      this.socket.on('response', (response) => {
        this.pendingReplies.delete(response.request_id);
        logger.info(`Client ${this.id} received response: ${JSON.stringify(response)}`);
      });

      this.socket.on('error', (error) => {
        logger.error(`Client ${this.id} error:`, error);
      });
    });
  }

  async disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.isConnected = false;
      logger.info(`Client ${this.id} disconnected`);
    }
  }

  async sendMessage() {
    if (!this.isConnected) return;

    const messageTypes = JSON.parse(process.env.MESSAGE_TYPES);
    const type = messageTypes[Math.floor(Math.random() * messageTypes.length)];
    const requestId = uuidv4();
    
    const message = {
      type,
      text: `Message ${this.messageCount + 1} from client ${this.id}`,
      request_id: requestId
    };

    // Add media URL based on message type
    if (type === 'voice') {
      message.voice_url = `https://example.com/voice/${uuidv4()}.mp3`;
    } else if (type === 'video') {
      message.video_url = `https://example.com/video/${uuidv4()}.mp4`;
    }

    this.pendingReplies.add(requestId);
    this.messageCount++;

    this.socket.emit('message', message);
    logger.info(`Client ${this.id} sent message ${requestId} of type ${type}`);
  }
}

class ClientManager {
  constructor() {
    this.clients = new Map();
    this.maxClients = parseInt(process.env.MAX_CLIENTS);
    this.maxMessagesPerClient = parseInt(process.env.MAX_MESSAGES_PER_CLIENT);
    this.maxConcurrentMessages = parseInt(process.env.MAX_CONCURRENT_MESSAGES);
    this.totalMessagesSent = 0;
    this.isRunning = false;
  }

  getRandomTimezone() {
    const timezones = [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
      'Pacific/Auckland',
      'Asia/Dubai'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  async createClient() {
    if (this.clients.size >= this.maxClients) {
      throw new Error('Maximum number of clients reached');
    }

    const clientId = `client-${uuidv4()}`;
    const timezone = this.getRandomTimezone();
    const client = new Client(clientId, timezone);
    await client.connect();
    this.clients.set(clientId, client);
    logger.info(`Created new client ${clientId} with timezone ${timezone}`);
    return client;
  }

  async removeClient(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      await client.disconnect();
      this.clients.delete(clientId);
      logger.info(`Removed client ${clientId}`);
    }
  }

  async start() {
    this.isRunning = true;
    logger.info('Starting client manager');

    // Create initial clients
    const initialClients = this.maxClients;
    for (let i = 0; i < initialClients; i++) {
      try {
        await this.createClient();
      } catch (error) {
        logger.error('Error creating initial client:', error);
      }
    }

    // Start message sending loop
    while (this.isRunning) {
      const activeClients = Array.from(this.clients.values())
        .filter(client => client.isConnected && client.messageCount < this.maxMessagesPerClient);
      
      if (activeClients.length === 0) {
        logger.info('All clients have reached their message limit');
        break;
      }

      // Send messages from random clients
      const clientsToSend = activeClients
        .sort(() => Math.random() - 0.5)
        .slice(0, this.maxConcurrentMessages);

      await Promise.all(clientsToSend.map(async (client) => {
        try {
          await client.sendMessage();
          this.totalMessagesSent++;
        } catch (error) {
          logger.error(`Error sending message from client ${client.id}:`, error);
        }
      }));

      // Wait for a random delay
      const delay = Math.floor(
        Math.random() * 
        (parseInt(process.env.MAX_MESSAGE_DELAY) - parseInt(process.env.MIN_MESSAGE_DELAY)) + 
        parseInt(process.env.MIN_MESSAGE_DELAY)
      );
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // Cleanup
    await this.stop();
  }

  async stop() {
    this.isRunning = false;
    logger.info('Stopping client manager');

    // Disconnect all clients
    await Promise.all(
      Array.from(this.clients.keys()).map(clientId => this.removeClient(clientId))
    );

    logger.info(`Client manager stopped. Total messages sent: ${this.totalMessagesSent}`);
  }
}

export default ClientManager; 