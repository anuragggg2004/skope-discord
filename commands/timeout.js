import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('timeout')
  .setDescription('Temporarily mutes a user using Discord Communication Timeout.')
  .addUserOption(option => 
    option.setName('user')
      .setDescription('The user to timeout')
      .setRequired(true))
  .addIntegerOption(option => 
    option.setName('duration')
      .setDescription('Timeout duration in minutes')
      .setRequired(true))
  .addStringOption(option => 
    option.setName('reason')
      .setDescription('Reason for timeout')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction, client) {
  const targetUser = interaction.options.getUser('user');
  const durationMinutes = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason');
  const moderator = interaction.user;
  
  const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: 'Could not find that user in the server.', ephemeral: true });
  }

  if (targetUser.bot) {
    return interaction.reply({ content: 'You cannot timeout bots.', ephemeral: true });
  }
  if (targetMember.roles.cache.has(config.roles.staff) || targetMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    return interaction.reply({ content: 'You cannot timeout a staff member.', ephemeral: true });
  }

  const durationMs = durationMinutes * 60 * 1000;
  
  try {
    await targetMember.timeout(durationMs, reason);
    
    // Log to console and Discord mod-logs channel
    await logger.logModAction(client, {
      action: 'TIMEOUT',
      targetUser,
      moderator,
      reason,
      duration: `${durationMinutes} minutes`
    });

    // Try to send DM to target
    try {
      const dmEmbed = new EmbedBuilder()
        .setTitle('⏳ Temporary Timeout')
        .setColor('#ff3333')
        .setDescription(`You have been temporarily timed out (muted) in **${interaction.guild.name}**.`)
        .addFields(
          { name: 'Duration', value: `${durationMinutes} minutes` },
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: moderator.tag }
        )
        .setTimestamp();
      await targetUser.send({ embeds: [dmEmbed] });
    } catch {}

    const replyEmbed = new EmbedBuilder()
      .setTitle('⏳ User Timed Out')
      .setColor('#ff3333')
      .setDescription(`Successfully applied timeout to <@${targetUser.id}>.`)
      .addFields(
        { name: 'User', value: `${targetUser.tag}`, inline: true },
        { name: 'Duration', value: `${durationMinutes} minutes`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [replyEmbed] });
  } catch (err) {
    logger.error(`Error applying timeout to ${targetUser.tag}`, err);
    await interaction.reply({ content: `Failed to timeout user: ${err.message}`, ephemeral: true });
  }
}
