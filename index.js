import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { connectDatabase } from './database/connection.js';
import { logger, memoryLogs } from './services/logger.js';
import { UserWarning, Ticket, Suggestion, BugReport, FeatureRequest } from './database/schemas.js';

// Import commands
import * as statusCmd from './commands/status.js';
import * as warnCmd from './commands/warn.js';
import * as timeoutCmd from './commands/timeout.js';
import * as announceCmd from './commands/announce.js';
import * as suggestCmd from './commands/suggest.js';
import * as suggestionCmd from './commands/suggestion.js';
import * as reportCmd from './commands/report.js';
import * as setupVerifCmd from './commands/setup-verification.js';
import * as setupSupportCmd from './commands/setup-support.js';
import * as setupFeedbackPanelsCmd from './commands/setup-feedback-panels.js';
import * as helpCmd from './commands/help.js';
import * as websiteCmd from './commands/website.js';
import * as lockCmd from './commands/lock.js';
import * as unlockCmd from './commands/unlock.js';
import * as purgeCmd from './commands/purge.js';
import * as slowmodeCmd from './commands/slowmode.js';
import * as kickCmd from './commands/kick.js';
import * as banCmd from './commands/ban.js';
import * as softbanCmd from './commands/softban.js';
import * as quizCmd from './commands/quiz.js';
import * as leaderboardCmd from './commands/leaderboard.js';
import * as confessCmd from './commands/confess.js';
import * as examsCmd from './commands/exams.js';
import * as studentProfileCmd from './commands/student-profile.js';
import * as reportMessageCmd from './commands/report-message.js';

// Import events
import * as readyEvent from './events/ready.js';
import * as memberAddEvent from './events/guildMemberAdd.js';
import * as messageCreateEvent from './events/messageCreate.js';
import * as interactionCreateEvent from './events/interactionCreate.js';

// 1. Initialize Express Health/Webhook Server
const app = express();

// Middleware to capture raw body for GitHub signature verification
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// A. Liveness Health Check Probe
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// B. GitHub Push Webhook endpoint for Auto-Announcements
app.post('/github-webhook', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  
  // Verify GitHub Signature if secret and header are present
  if (signature && config.githubWebhookSecret) {
    const hmac = crypto.createHmac('sha256', config.githubWebhookSecret);
    const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');
    if (signature !== digest) {
      logger.warn('GitHub Webhook failed signature verification.');
      return res.status(401).send('Invalid signature');
    }
  }

  const event = req.headers['x-github-event'];
  if (event === 'ping') {
    logger.info('Received ping from GitHub webhook.');
    return res.status(200).send('pong');
  }

  if (event === 'push') {
    const payload = req.body;
    const ref = payload.ref || '';
    
    // Only announce pushes/merges to main or release branches
    if (ref.includes('refs/heads/main') || ref.includes('refs/heads/release')) {
      const commit = payload.head_commit;
      const repo = payload.repository;
      
      if (commit) {
        const commitMsg = commit.message.split('\n')[0];
        const authorName = commit.author.username || commit.author.name || 'Developer';
        const commitUrl = commit.url;
        
        logger.info(`Received Push Webhook. Announcing commit: "${commitMsg}" by @${authorName}`);

        try {
          const channel = await client.channels.fetch(config.channels.announcements).catch(() => null);
          if (channel && channel.isTextBased()) {
            const embed = {
              title: '🚀 New Skope Update Live!',
              color: 0x2ecc71, // Green color matching positive update
              description: `A new deployment has been successfully pushed to the production environment.`,
              fields: [
                { name: '📝 Commit Message', value: `\`${commitMsg}\`` },
                { name: '👤 Author', value: `@${authorName}`, inline: true },
                { name: '📂 Repository', value: `[${repo?.name || 'skope'}](${repo?.html_url || ''})`, inline: true },
                { name: '🔗 Changelog / Diff', value: `[View Commit Diff](${commitUrl})` }
              ],
              timestamp: new Date().toISOString(),
              footer: { text: 'Automated Deployment System' }
            };

            await channel.send({ embeds: [embed] });
          }
        } catch (err) {
          logger.error('Failed to post GitHub webhook announcement to Discord:', err);
        }
      }
    }
  }

  res.status(200).send('ok');
});

// C. Serve Static Dashboard
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// D. Dashboard API: Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const warnings = await UserWarning.find({});
    const totalWarnings = warnings.reduce((acc, w) => acc + (w.warnings?.length || 0), 0);
    const totalVerified = warnings.filter(w => w.verified).length;

    const openTickets = await Ticket.countDocuments({ status: 'open' });
    const closedTickets = await Ticket.countDocuments({ status: 'closed' });

    const totalSuggestions = await Suggestion.countDocuments();
    const pendingSuggestions = await Suggestion.countDocuments({ status: 'pending' });
    const approvedSuggestions = await Suggestion.countDocuments({ status: 'approved' });

    const totalBugs = await BugReport.countDocuments();
    const resolvedBugs = await BugReport.countDocuments({ status: 'resolved' });

    const totalFeatures = await FeatureRequest.countDocuments();

    res.json({
      warnings: { total: totalWarnings, verified: totalVerified },
      tickets: { open: openTickets, closed: closedTickets },
      suggestions: { total: totalSuggestions, pending: pendingSuggestions, approved: approvedSuggestions },
      bugs: { total: totalBugs, resolved: resolvedBugs },
      features: { total: totalFeatures }
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// E. Dashboard API: Config
app.get('/api/dashboard/config', (req, res) => {
  res.json({
    name: client.user ? client.user.username : 'Skope Bot',
    tag: client.user ? client.user.tag : 'Skope#8757',
    avatar: client.user ? client.user.displayAvatarURL() : 'https://cdn.discordapp.com/embed/avatars/0.png',
    status: client.user ? (client.user.presence?.status || 'online') : 'offline',
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    ping: client.ws.ping
  });
});

// F. Dashboard API: Update Config
app.post('/api/dashboard/config', (req, res) => {
  try {
    const { status, activity } = req.body;
    if (client.user) {
      if (status) client.user.setStatus(status);
      if (activity) client.user.setActivity(activity);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Bot client is not logged in yet.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// G. Dashboard API: Commands List
app.get('/api/dashboard/commands', (req, res) => {
  const cmds = Array.from(client.commands.values()).map(cmd => ({
    name: cmd.data.name,
    description: cmd.data.description
  }));
  res.json({ commands: cmds });
});

// H. Dashboard API: Live Logs
app.get('/api/dashboard/logs', (req, res) => {
  res.json({ logs: memoryLogs });
});

// I. Dashboard API: AI Settings
app.get('/api/dashboard/ai', (req, res) => {
  res.json({
    keyConfigured: !!config.perspectiveApiKey,
    threshold: 0.70,
    stressFilters: ['kill myself', 'end my life', 'suicide', 'self harm'],
    spamFilters: ['buy notes', 'cheating', 'leak paper', 'coaching classes']
  });
});

app.post('/api/dashboard/ai', (req, res) => {
  res.json({ success: true, message: 'AI Config updated successfully' });
});

// Start express server
app.listen(config.port, () => {
  logger.info(`Express Server running on port ${config.port}`);
});

// 2. Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load commands into client Map
client.commands = new Map();
const commandModules = [
  statusCmd,
  warnCmd,
  timeoutCmd,
  announceCmd,
  suggestCmd,
  suggestionCmd,
  reportCmd,
  setupVerifCmd,
  setupSupportCmd,
  setupFeedbackPanelsCmd,
  helpCmd,
  websiteCmd,
  lockCmd,
  unlockCmd,
  purgeCmd,
  slowmodeCmd,
  kickCmd,
  banCmd,
  softbanCmd,
  quizCmd,
  leaderboardCmd,
  confessCmd,
  examsCmd,
  studentProfileCmd,
  reportMessageCmd
];

for (const cmd of commandModules) {
  client.commands.set(cmd.data.name, cmd);
}

// Bind events to client
const eventModules = [
  readyEvent,
  memberAddEvent,
  messageCreateEvent,
  interactionCreateEvent
];

for (const event of eventModules) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Connect Database & Login Bot
(async () => {
  await connectDatabase();
  
  if (config.discordToken && config.discordToken !== 'your_discord_token_here') {
    client.login(config.discordToken).catch(err => {
      logger.error('Failed to log in Discord bot client. Check your token.', err);
    });
  } else {
    logger.error('DISCORD_TOKEN is missing or not configured in .env. Bot login aborted.');
  }
})();

// Error recovery
process.on('unhandledRejection', (reason, promise) => {
  logger.logDiscordError(client, 'Unhandled Rejection at Promise', reason);
});

process.on('uncaughtException', (error) => {
  logger.logDiscordError(client, 'Uncaught Exception thrown', error);
});
