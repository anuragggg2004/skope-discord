import winston from 'winston';
import { EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

// Setup Winston Logger for local console
const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Helper: send embed to a specific channel
async function sendToDiscordChannel(client, channelId, embed) {
  if (!client || !client.isReady()) return;
  if (!channelId || channelId === '123456789012345678') return; // Ignore default placeholder ID
  
  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    winstonLogger.error(`Failed to send log to Discord channel ${channelId}: ${err.message}`);
  }
}

export const memoryLogs = [];

function pushToMemoryLogs(level, message) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  memoryLogs.push(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  if (memoryLogs.length > 100) {
    memoryLogs.shift();
  }
}

export const logger = {
  info: (msg) => {
    pushToMemoryLogs('info', msg);
    winstonLogger.info(msg);
  },
  warn: (msg) => {
    pushToMemoryLogs('warn', msg);
    winstonLogger.warn(msg);
  },
  error: (msg, err) => {
    pushToMemoryLogs('error', `${msg}${err ? `: ${err.message}` : ''}`);
    winstonLogger.error(msg);
    if (err && err.stack) winstonLogger.error(err.stack);
  },
  
  // Log Command Executions
  logCommand: async (client, interaction) => {
    const username = interaction.user.tag;
    const commandName = interaction.commandName;
    const channelName = interaction.channel?.name || 'DM';
    
    const logMsg = `@${username} ran /${commandName} in #${channelName}`;
    pushToMemoryLogs('info', logMsg);
    winstonLogger.info(logMsg);
    
    const embed = new EmbedBuilder()
      .setTitle('Command Executed')
      .setColor('#7289da')
      .setDescription(logMsg)
      .addFields(
        { name: 'User', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: true },
        { name: 'Channel', value: `<#${interaction.channelId}>`, inline: true }
      )
      .setTimestamp();
      
    await sendToDiscordChannel(client, config.channels.commandLogs, embed);
  },
  
  // Log Moderation Actions (Warn, Timeout, Kick, Ban, Auto-Mod)
  logModAction: async (client, { action, targetUser, moderator, reason, duration }) => {
    const logMsg = `[${action}] Target: @${targetUser.tag}, Moderator: ${moderator ? `@${moderator.tag}` : 'Auto-Mod'}, Reason: ${reason}`;
    pushToMemoryLogs('warn', logMsg);
    winstonLogger.warn(logMsg);
    
    let color = '#ffcc00'; // Yellow for warnings/timeout
    if (action === 'KICK' || action === 'BAN') color = '#ff3333'; // Red
    if (action === 'AUTO_DELETE') color = '#ff9900'; // Orange
    
    const embed = new EmbedBuilder()
      .setTitle(`Mod Action: ${action}`)
      .setColor(color)
      .setDescription(logMsg)
      .addFields(
        { name: 'Target User', value: `<@${targetUser.id}> (${targetUser.id})`, inline: true },
        { name: 'Responsible Staff', value: moderator ? `<@${moderator.id}>` : 'System (Auto-Mod)', inline: true },
        { name: 'Reason', value: reason || 'No reason provided' }
      )
      .setTimestamp();
      
    if (duration) {
      embed.addFields({ name: 'Duration', value: duration, inline: true });
    }
    
    await sendToDiscordChannel(client, config.channels.modLogs, embed);
  },
  
  // Log Errors
  logDiscordError: async (client, errorMsg, error) => {
    winstonLogger.error(`${errorMsg}: ${error?.message || error}`);
    if (error && error.stack) winstonLogger.error(error.stack);
    
    const embed = new EmbedBuilder()
      .setTitle('Unhandled Error / Exception')
      .setColor('#ff0033')
      .setDescription(errorMsg)
      .addFields(
        { name: 'Error Message', value: error?.message || String(error) },
        { name: 'Stack Trace', value: `\`\`\`js\n${(error?.stack || 'No stack trace available').substring(0, 1000)}\n\`\`\`` }
      )
      .setTimestamp();
      
    await sendToDiscordChannel(client, config.channels.errorLogs, embed);
  }
};
