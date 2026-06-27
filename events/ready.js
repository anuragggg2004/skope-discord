import { ActivityType } from 'discord.js';
import { deployCommands } from '../commands/deploy.js';
import { logger } from '../services/logger.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  logger.info(`Logged in successfully as ${client.user.tag}`);
  
  // Set Bot Status Activity
  client.user.setActivity('Class 12 Career Counselor', { type: ActivityType.Playing });
  
  // Auto-deploy Slash Commands on boot
  await deployCommands();
  
  logger.info('Bot is ready and active.');
}
