import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';
import os from 'os';

export const data = new SlashCommandBuilder()
  .setName('status')
  .setDescription('Displays bot status, uptime, API latency, and database status.');

export async function execute(interaction, client) {
  const dbStatus = mongoose.connection.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected';
  
  // Format Uptime
  let totalSeconds = (client.uptime / 1000);
  let days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;
  let hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = Math.floor(totalSeconds % 60);
  
  const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;
  
  // Memory usage
  const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
  const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  
  // Latency
  const ping = client.ws.ping;
  
  const embed = new EmbedBuilder()
    .setTitle('🤖 Skope Bot Status')
    .setColor('#4caf50')
    .addFields(
      { name: '🔌 Bot Uptime', value: uptimeString, inline: true },
      { name: '🏓 API Latency', value: `${ping}ms`, inline: true },
      { name: '🗄️ MongoDB Status', value: dbStatus, inline: true },
      { name: '💻 Memory Usage', value: `${memoryUsed} MB`, inline: true },
      { name: '🖥️ System Host', value: os.platform(), inline: true },
      { name: '👥 Connected Servers', value: `${client.guilds.cache.size}`, inline: true }
    )
    .setFooter({ text: 'Skope Career counseling platform' })
    .setTimestamp();
    
  await interaction.reply({ embeds: [embed] });
}
