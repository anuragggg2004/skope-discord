import 'dotenv/config';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNELS_TO_DELETE = [
  'bugs', 'feature-requests', 'feedback', 
  'roadmap', 'changelog', 
  'partnerships', 'wins', 
  'career-insights', 'introduce-your-path'
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (!guild) {
    console.error('Guild not found');
    process.exit(1);
  }

  const channels = await guild.channels.fetch();

  // 1. Delete redundant channels
  console.log('--- Deleting Redundant Channels ---');
  for (const [id, channel] of channels) {
    if (CHANNELS_TO_DELETE.includes(channel.name)) {
      try {
        await channel.delete('Server Reorganization Cleanup');
        console.log(`Deleted: ${channel.name}`);
      } catch (err) {
        console.error(`Failed to delete ${channel.name}: ${err.message}`);
      }
    }
  }

  // 2. Create Study Rooms
  console.log('--- Creating Study Rooms ---');
  try {
    const studyCategory = await guild.channels.create({
      name: '📚 STUDY ROOMS',
      type: ChannelType.GuildCategory
    });

    await guild.channels.create({
      name: '➕ New Study Room',
      type: ChannelType.GuildVoice,
      parent: studyCategory.id
    });
    console.log('Created: ➕ New Study Room');

    await guild.channels.create({
      name: 'Silent Study',
      type: ChannelType.GuildVoice,
      parent: studyCategory.id
    });
    console.log('Created: Silent Study');

    await guild.channels.create({
      name: 'Group Discussions',
      type: ChannelType.GuildVoice,
      parent: studyCategory.id
    });
    console.log('Created: Group Discussions');
  } catch (err) {
    console.error(`Failed to create Study Rooms: ${err.message}`);
  }

  // 3. Create Lounge
  console.log('--- Creating Lounge ---');
  try {
    const loungeCategory = await guild.channels.create({
      name: '🎵 LOUNGE',
      type: ChannelType.GuildCategory
    });

    await guild.channels.create({
      name: 'music-commands',
      type: ChannelType.GuildText,
      parent: loungeCategory.id,
      topic: 'Use /play, /skip, /queue here!'
    });
    console.log('Created: music-commands');

    await guild.channels.create({
      name: 'Lofi & Chill',
      type: ChannelType.GuildVoice,
      parent: loungeCategory.id
    });
    console.log('Created: Lofi & Chill');

    await guild.channels.create({
      name: 'Gaming Lounge',
      type: ChannelType.GuildVoice,
      parent: loungeCategory.id
    });
    console.log('Created: Gaming Lounge');
  } catch (err) {
    console.error(`Failed to create Lounge: ${err.message}`);
  }

  console.log('--- Reorganization Complete ---');
  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("Login failed", err);
    process.exit(1);
});
