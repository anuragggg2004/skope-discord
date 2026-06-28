import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discordToken: process.env.DISCORD_TOKEN,
  port: parseInt(process.env.PORT || '3000', 10),
  prefix: process.env.PREFIX || '!',
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
    dailyQuiz: process.env.CHANNEL_DAILY_QUIZ,
    confessions: process.env.CHANNEL_CONFESSIONS,
    examAlerts: process.env.CHANNEL_EXAM_ALERTS,
    createRoom: process.env.CHANNEL_CREATE_ROOM,
  },
  
  // Categories
  categories: {
    tickets: process.env.CATEGORY_TICKETS,
    studyRooms: process.env.CATEGORY_STUDY_ROOMS,
  },

  // Website URLs
  websiteUrl: process.env.WEBSITE_URL || 'https://anuraggg.tech',
  websiteRenderUrl: process.env.WEBSITE_RENDER_URL || 'https://skope-77eq.onrender.com/'
};

// Validate that required values are present
const missingRequired = [];
if (!config.discordToken) missingRequired.push('DISCORD_TOKEN');
if (!config.guildId) missingRequired.push('GUILD_ID');

if (missingRequired.length > 0) {
  console.warn(`[Config Warning] Missing required environment variables: ${missingRequired.join(', ')}. Bot may not function properly.`);
}
