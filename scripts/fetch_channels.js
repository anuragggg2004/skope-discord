import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import fs from 'fs';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const channels = await guild.channels.fetch();
  let channelData = '';

  channels.forEach(channel => {
    channelData += `ID: ${channel.id} | Name: ${channel.name} | Type: ${channel.type} | Parent: ${channel.parent ? channel.parent.name : 'None'}\n`;
  });

  fs.writeFileSync('channels_list.txt', channelData);
  console.log('Saved channels to channels_list.txt');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("Login failed", err);
    process.exit(1);
});
