import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { analyzeContent } from '../services/perspective.js';
import { UserWarning } from '../database/schemas.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const name = 'messageCreate';
export const once = false;

export async function execute(message, client) {
  // Ignore bots and direct messages
  if (message.author.bot || !message.guild) return;

  // Skip checks for staff members
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (member && (member.roles.cache.has(config.roles.staff) || member.permissions.has(PermissionFlagsBits.ModerateMembers))) {
    return;
  }

  try {
    const analysis = await analyzeContent(message.content);

    // 1. Handle Stress / Mental Health crisis (Supportive outreach)
    if (analysis.isStress) {
      // Alert staff in mod-logs
      const alertEmbed = new EmbedBuilder()
        .setTitle('🚨 Stress/Mental Health Alert')
        .setColor('#ff3333')
        .setDescription(
          `User <@${message.author.id}> triggered a severe stress/self-harm filter.\n` +
          `**Channel**: <#${message.channelId}>\n` +
          `**Message**: "${message.content}"`
        )
        .setFooter({ text: 'Please check in on this student or reach out.' })
        .setTimestamp();
      
      const modLogChannel = await client.channels.fetch(config.channels.modLogs).catch(() => null);
      if (modLogChannel && modLogChannel.isTextBased()) {
        await modLogChannel.send({ embeds: [alertEmbed] });
      }

      // Send supportive DM to user
      try {
        const supportEmbed = new EmbedBuilder()
          .setTitle('❤️ We are here for you')
          .setColor('#9b59b6')
          .setDescription(
            `Hey **${message.author.username}**, we noticed you might be going through a highly stressful or difficult time.\n\n` +
            `Competitive exam prep (like JEE/NEET/CUET) and school pressure can be extremely overwhelming, but please remember that **you are not alone** and your worth is not defined by any exam.\n\n` +
            `If you need someone to talk to, here are some free, confidential Indian student helplines:\n` +
            `• **AASRA**: 📞 +91-9820466726 (24/7)\n` +
            `• **Vandrevala Foundation**: 📞 +91-9999666555 (24/7)\n` +
            `• **KIRAN**: 📞 1800-599-0019 (Govt Mental Health Helpline)\n\n` +
            `You can also reach out to the moderators or school advisors in this server by opening a private ticket with \`/report\`. Take care of yourself!`
          )
          .setTimestamp();
        await message.author.send({ embeds: [supportEmbed] });
      } catch (dmErr) {
        logger.warn(`Failed to send stress support DM to ${message.author.tag}: ${dmErr.message}`);
      }
      return; // Do not delete the message unless it's toxic/spam
    }

    // 2. Handle Academic Spam or Toxicity (Deletions & Warnings)
    if (analysis.isSpam || analysis.isToxic) {
      // Delete the message
      await message.delete().catch(() => null);

      const filterType = analysis.isSpam ? 'Academic Spam Filter' : 'Toxicity & Abuse Guard';
      const reason = `Violated safety filter: ${analysis.reason}`;

      // Fetch or create user record for warning increment
      let userRecord = await UserWarning.findOne({ userId: message.author.id });
      if (!userRecord) {
        userRecord = new UserWarning({ userId: message.author.id, warnings: [] });
      }

      userRecord.warnings.push({
        reason,
        moderatorId: client.user.id,
        timestamp: new Date()
      });

      await userRecord.save();
      const warningCount = userRecord.warnings.length;

      // Log moderation action
      await logger.logModAction(client, {
        action: `AUTO_DELETE (${analysis.isSpam ? 'SPAM' : 'TOXICITY'}, Warning #${warningCount})`,
        targetUser: message.author,
        reason
      });

      // Reply in channel warning the user
      const warningEmbed = new EmbedBuilder()
        .setTitle('⚠️ Message Removed')
        .setColor('#e67e22')
        .setDescription(
          `<@${message.author.id}>, your message was removed by our auto-moderation security.\n` +
          `**Reason**: ${analysis.reason}\n` +
          `You have received a warning (Total: **${warningCount}/5**).`
        )
        .setTimestamp();

      const warningMsg = await message.channel.send({ embeds: [warningEmbed] });
      // Delete warning notification after 10 seconds
      setTimeout(() => {
        warningMsg.delete().catch(() => null);
      }, 10000);

      // DM warning
      try {
        const dmWarningEmbed = new EmbedBuilder()
          .setTitle('⚠️ Message Removed & Warning Issued')
          .setColor('#e67e22')
          .setDescription(`Your message was deleted in **${message.guild.name}** for violating safety rules.`)
          .addFields(
            { name: 'Reason', value: analysis.reason },
            { name: 'Total Warnings', value: `${warningCount}/5` }
          )
          .setTimestamp();
        await message.author.send({ embeds: [dmWarningEmbed] });
      } catch (dmErr) {
        logger.warn(`Could not send DM auto-mod warning to ${message.author.tag}: ${dmErr.message}`);
      }

      // Enforce auto-punishments
      if (warningCount >= 5) {
        try {
          await member.kick(`Automatic Kick: Reached 5 warnings. Last: ${reason}`);
          await logger.logModAction(client, {
            action: 'KICK (Auto)',
            targetUser: message.author,
            reason: `Reached 5 warnings. Last: ${reason}`
          });
        } catch (err) {
          logger.error(`Failed to auto-kick ${message.author.tag}`, err);
        }
      } else if (warningCount >= 3) {
        try {
          const durationMs = 24 * 60 * 60 * 1000; // 24 hours
          await member.timeout(durationMs, `Automatic Timeout: Reached 3 warnings. Last: ${reason}`);
          await logger.logModAction(client, {
            action: 'TIMEOUT (Auto)',
            targetUser: message.author,
            reason: `Reached 3 warnings. Last: ${reason}`,
            duration: '24 hours'
          });
        } catch (err) {
          logger.error(`Failed to auto-timeout ${message.author.tag}`, err);
        }
      }
    }
  } catch (error) {
    logger.error('Error in messageCreate auto-mod execution', error);
  }
}
