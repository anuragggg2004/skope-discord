import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import * as statusCmd from './status.js';
import * as warnCmd from './warn.js';
import * as timeoutCmd from './timeout.js';
import * as announceCmd from './announce.js';
import * as suggestCmd from './suggest.js';
import * as suggestionCmd from './suggestion.js';
import * as reportCmd from './report.js';
import * as setupVerifCmd from './setup-verification.js';
import * as setupSupportCmd from './setup-support.js';
import * as setupFeedbackPanelsCmd from './setup-feedback-panels.js';

const commands = [
  statusCmd.data.toJSON(),
  warnCmd.data.toJSON(),
  timeoutCmd.data.toJSON(),
  announceCmd.data.toJSON(),
  suggestCmd.data.toJSON(),
  suggestionCmd.data.toJSON(),
  reportCmd.data.toJSON(),
  setupVerifCmd.data.toJSON(),
  setupSupportCmd.data.toJSON(),
  setupFeedbackPanelsCmd.data.toJSON()
];

// Decode Client ID from the first segment of the Discord Bot Token
const base64ClientId = config.discordToken.split('.')[0];
const clientId = Buffer.from(base64ClientId, 'base64').toString('ascii');

console.log(`Decoded Client ID from token: ${clientId}`);

const rest = new REST({ version: '10' }).setToken(config.discordToken);

export async function deployCommands() {
  try {
    if (!config.guildId || config.guildId === '123456789012345678') {
      console.warn('Deploy Warning: GUILD_ID is not configured in .env. Skipping slash commands deployment.');
      return;
    }
    
    console.log(`Started refreshing ${commands.length} application (/) commands for Guild ${config.guildId}.`);
    
    await rest.put(
      Routes.applicationGuildCommands(clientId, config.guildId),
      { body: commands }
    );
    
    console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
  } catch (error) {
    console.error('Failed to deploy application commands:', error);
  }
}

import { fileURLToPath } from 'url';

// Allow running this script directly
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  deployCommands();
}
