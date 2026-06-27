import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { UserWarning } from '../database/schemas.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('warn')
  .setDescription('Warns a user and applies automatic punishment if thresholds are hit.')
  .addUserOption(option => 
    option.setName('user')
      .setDescription('The user to warn')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('reason')
      .setDescription('Reason for warning')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction, client) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: 'Could not find that user in the server.', ephemeral: true });
  }

  // Prevent warning bots or staff members
  if (targetUser.bot) {
    return interaction.reply({ content: 'You cannot warn bots.', ephemeral: true });
  }
  if (targetMember.roles.cache.has(config.roles.staff) || targetMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'You cannot warn a staff member.', ephemeral: true });
  }

  // Save warning to MongoDB
  let userRecord = await UserWarning.findOne({ userId: targetUser.id });
  if (!userRecord) {
    userRecord = new UserWarning({ userId: targetUser.id, warnings: [] });
  }
  
  userRecord.warnings.push({
    reason,
    moderatorId: moderator.id,
    timestamp: new Date()
  });
  
  await userRecord.save();
  const warningCount = userRecord.warnings.length;

  // Log in console and Discord mod-logs channel
  await logger.logModAction(client, {
    action: `WARN (Warning #${warningCount})`,
    targetUser,
    moderator,
    reason
  });

  // Try to DM the user
  try {
    const dmEmbed = new EmbedBuilder()
      .setTitle('⚠️ Warning Issued')
      .setColor('#ff9900')
      .setDescription(`You have received a warning in **${interaction.guild.name}**.\nTotal Warnings: **${warningCount}**`)
      .addFields(
        { name: 'Reason', value: reason },
        { name: 'Moderator', value: moderator.tag }
      )
      .setFooter({ text: 'Please adhere to the rules to avoid further action.' })
      .setTimestamp();
    await targetUser.send({ embeds: [dmEmbed] });
  } catch (err) {
    logger.warn(`Could not send DM warning to ${targetUser.tag}: ${err.message}`);
  }

  let punishmentMessage = '';
  
  // Auto-punish triggers
  if (warningCount >= 5) {
    punishmentMessage = '\n🚨 **5 warnings reached. User has been kicked.**';
    try {
      await targetMember.kick(`Automatic Kick: Reached 5 warnings. Last warning: ${reason}`);
      await logger.logModAction(client, {
        action: 'KICK (Auto)',
        targetUser,
        reason: `Reached 5 warnings. Last: ${reason}`
      });
    } catch (err) {
      punishmentMessage = `\n⚠️ **Could not kick user**: ${err.message}`;
    }
  } else if (warningCount >= 3) {
    punishmentMessage = '\n⏰ **3 warnings reached. User has been timed out for 24 hours.**';
    try {
      const durationMs = 24 * 60 * 60 * 1000; // 24 hours
      await targetMember.timeout(durationMs, `Automatic Timeout: Reached 3 warnings. Last warning: ${reason}`);
      await logger.logModAction(client, {
        action: 'TIMEOUT (Auto)',
        targetUser,
        reason: `Reached 3 warnings. Last: ${reason}`,
        duration: '24 hours'
      });
    } catch (err) {
      punishmentMessage = `\n⚠️ **Could not timeout user**: ${err.message}`;
    }
  }

  const replyEmbed = new EmbedBuilder()
    .setTitle('⚠️ User Warned')
    .setColor('#ff9900')
    .setDescription(`Successfully warned <@${targetUser.id}>.`)
    .addFields(
      { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
      { name: 'Warnings Count', value: `${warningCount}`, inline: true },
      { name: 'Reason', value: reason }
    )
    .setTimestamp();

  if (punishmentMessage) {
    replyEmbed.setDescription(replyEmbed.data.description + punishmentMessage);
  }

  await interaction.reply({ embeds: [replyEmbed] });
}
