import { EmbedBuilder, AuditLogEvent } from 'discord.js';
import { logger } from './logger.js';
import { config } from '../config.js';

const actionTracker = new Map();

/**
 * Track a destructive action by a user. If they exceed the threshold, quarantine them.
 * @param {import('discord.js').Client} client 
 * @param {import('discord.js').Guild} guild 
 * @param {string} userId The ID of the user performing the action
 * @param {string} actionType Type of action (e.g. 'CHANNEL_DELETE')
 */
export async function trackAction(client, guild, userId, actionType) {
  // Ignore actions by the bot itself
  if (userId === client.user.id) return;

  const now = Date.now();
  if (!actionTracker.has(userId)) {
    actionTracker.set(userId, []);
  }

  const timestamps = actionTracker.get(userId);
  timestamps.push(now);

  // Keep only actions from the last 30 seconds
  const recentActions = timestamps.filter(t => now - t < 30000);
  actionTracker.set(userId, recentActions);

  // Threshold: 3 destructive actions within 30 seconds
  if (recentActions.length >= 3) {
    await quarantineUser(client, guild, userId, actionType);
    // Clear tracker so we don't spam quarantine actions
    actionTracker.delete(userId);
  }
}

/**
 * Fetches the most recent audit log for a specific event type to find the executor.
 */
export async function fetchExecutor(guild, auditLogEvent) {
  try {
    const fetchedLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: auditLogEvent,
    });
    const log = fetchedLogs.entries.first();
    if (!log) return null;

    // Check if the log is recent (within the last 10 seconds)
    if (Date.now() - log.createdTimestamp < 10000) {
      return log.executor.id;
    }
  } catch (err) {
    logger.warn(`Could not fetch audit log for event ${auditLogEvent}: ${err.message}`);
  }
  return null;
}

/**
 * Remove all roles from a user and send an emergency alert.
 */
async function quarantineUser(client, guild, userId, triggerAction) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;

    const botMember = await guild.members.fetch(client.user.id);
    if (!botMember.permissions.has('ManageRoles')) {
      logger.warn(`Cannot quarantine ${member.user.tag}: Missing ManageRoles permission.`);
      return;
    }

    // Strip all roles (except @everyone)
    const rolesToRemove = member.roles.cache.filter(role => role.id !== guild.id && role.position < botMember.roles.highest.position);
    await member.roles.remove(rolesToRemove, 'Anti-Nuke Triggered');

    const alertEmbed = new EmbedBuilder()
      .setTitle('☢️ ANTI-NUKE TRIGGERED')
      .setColor('#ff0000')
      .setDescription(
        `**User <@${userId}> has been quarantined!**\n` +
        `They exceeded the safety threshold by performing too many destructive actions rapidly.\n\n` +
        `**Trigger Action**: ${triggerAction}\n` +
        `All manageable roles have been removed from this user. Please investigate immediately.`
      )
      .setTimestamp();

    const modLogChannel = await client.channels.fetch(config.channels.modLogs).catch(() => null);
    if (modLogChannel && modLogChannel.isTextBased()) {
      await modLogChannel.send({ content: '@here', embeds: [alertEmbed] });
    }

    logger.info(`Anti-Nuke triggered on ${member.user.tag} (${userId})`);
  } catch (error) {
    logger.error(`Failed to quarantine user ${userId} in anti-nuke`, error);
  }
}
