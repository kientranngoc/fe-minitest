import ClientManager from './ClientManager.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const manager = new ClientManager();
  
  try {
    await manager.start();
  } catch (error) {
    console.error('Error running client manager:', error);
    process.exit(1);
  }
}

main(); 