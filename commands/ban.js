import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { logger } from '../services/logger.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Bans a specified user from the server.')
  .addUserOption(opt => 
    opt.setName('user')
       .setDescription('The user to ban')
       .setRequired(true)
  )
  .addStringOption(opt => 
    opt.setName('reason')
       .setDescription('Reason for the ban')
       .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction, client) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild;

  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  // Prevent banning self or admin
  if (member && !member.bannable) {
    return interaction.reply({ content: '⚠️ I do not have permission to ban this member (they may have a higher role).', ephemeral: true });
  }

  try {
    // DM warning first
    await targetUser.send(`🚨 You have been **banned** from **${guild.name}**.\n**Reason**: ${reason}`).catch(() => null);

    await guild.bans.create(targetUser.id, {
      deleteMessageSeconds: 7 * 24 * 60 * 60, // delete 7 days of messages
      reason: `Banned by moderator: ${interaction.user.tag}. Reason: ${reason}`
    });

    // Log action
    await logger.logModAction(client, {
      action: 'BAN',
      targetUser,
      moderator: interaction.user,
      reason
    });

    const embed = new EmbedBuilder()
      .setTitle('🚨 User Banned')
      .setColor('#ef4444') // Red
      .setDescription(`Successfully banned **@${targetUser.tag}** and deleted their messages from the last 7 days.`)
      .addFields(
        { name: 'Target', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Ban command error:', err);
    await interaction.reply({ content: `Failed to ban user: ${err.message}`, ephemeral: true });
  }
}
