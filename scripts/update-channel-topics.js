import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import { config } from '../config.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const topicMap = {
  'suggestions': '💡 Share your ideas and suggestions to improve Skope!',
  'announcements': '📢 Official updates and announcements from the Skope team.',
  'command-logs': '⚙️ Audit logs for bot commands.',
  'mod-logs': '🛡️ Moderator action and security logs.',
  'error-logs': '⚠️ Bot error and exception logs.',
  'verification': '✅ Verify your student status to unlock the server.',
  'support': '🎫 Get help and support from the community.',
  'feedback': '💬 Share your feedback about your Skope experience.',
  'bugs': '🐛 Report bugs and glitches so we can fix them.',
  'feature-requests': '✨ Request new features for the bot and platform.',
  'daily-quiz': '🧠 Test your knowledge with daily DPP questions!',
  'confessions': '🤫 Anonymous venting and confessions space.',
  'exam-alerts': '🚨 Important dates and alerts for JEE, NEET, CUET, and more.',
  'general': '👋 General chat for everyone in the Skope community!',
  'science': '🔬 Discussion for JEE, NEET, and Science students.',
  'commerce': '📈 Discussion for CA, CS, CUET, and Commerce students.',
  'arts': '🎨 Discussion for Humanities and Arts students.'
};

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const guild = await client.guilds.fetch(config.guildId);
    if (!guild) {
      console.error('Guild not found.');
      process.exit(1);
    }

    const channels = await guild.channels.fetch();
    let updatedCount = 0;

    for (const [id, channel] of channels) {
      if (channel && channel.type === ChannelType.GuildText) {
        let newTopic = topicMap[channel.name.toLowerCase()];
        
        if (!newTopic) {
          // Generic topic for unknown channels
          const formattedName = channel.name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          newTopic = `Welcome to the ${formattedName} channel!`;
        }

        if (channel.topic !== newTopic) {
          try {
            await channel.setTopic(newTopic, 'Automated topic update based on channel name.');
            console.log(`✅ Updated topic for #${channel.name}`);
            updatedCount++;
          } catch (err) {
            console.error(`❌ Failed to update topic for #${channel.name}: ${err.message}`);
          }
        } else {
          console.log(`⏭️ Topic already correct for #${channel.name}`);
        }
      }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} channel descriptions!`);
  } catch (error) {
    console.error('Error fetching guild/channels:', error);
  }

  process.exit(0);
});

client.login(config.discordToken);
