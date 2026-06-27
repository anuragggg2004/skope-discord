import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN,
  port: parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/discord_skope',
  perspectiveApiKey: process.env.PERSPECTIVE_API_KEY || null,
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'skope_secret',
  
  // Guild configurations
  guildId: process.env.GUILD_ID,
  
  // Roles
  roles: {
    student: process.env.ROLE_STUDENT,
    science: process.env.ROLE_SCIENCE,
    commerce: process.env.ROLE_COMMERCE,
    arts: process.env.ROLE_ARTS,
    staff: process.env.ROLE_STAFF,
  },
  
  // Channels
  channels: {
    suggestions: process.env.CHANNEL_SUGGESTIONS,
    announcements: process.env.CHANNEL_ANNOUNCEMENTS,
    commandLogs: process.env.CHANNEL_COMMAND_LOGS,
    modLogs: process.env.CHANNEL_MOD_LOGS,
    errorLogs: process.env.CHANNEL_ERROR_LOGS,
    verification: process.env.CHANNEL_VERIFICATION,
    support: process.env.CHANNEL_SUPPORT,
    feedback: process.env.CHANNEL_FEEDBACK,
    bugs: process.env.CHANNEL_BUGS,
    featureRequests: process.env.CHANNEL_FEATURE_REQUESTS,
  },
  
  // Categories
  categories: {
    tickets: process.env.CATEGORY_TICKETS,
  }
};

// Validate that required values are present
const missingRequired = [];
if (!config.discordToken) missingRequired.push('DISCORD_TOKEN');
if (!config.guildId) missingRequired.push('GUILD_ID');

if (missingRequired.length > 0) {
  console.warn(`[Config Warning] Missing required environment variables: ${missingRequired.join(', ')}. Bot may not function properly.`);
}
