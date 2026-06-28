import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { logger } from '../services/logger.js';

export const data = new SlashCommandBuilder()
  .setName('kick')
  .setDescription('Kicks a specified member from the server.')
  .addUserOption(opt => 
    opt.setName('user')
       .setDescription('The member to kick')
       .setRequired(true)
  )
  .addStringOption(opt => 
    opt.setName('reason')
       .setDescription('Reason for the kick')
       .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction, client) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild;

  const member = await guild.members.fetch(targetUser.id).catch(() => null);
  if (!member) {
    return interaction.reply({ content: '⚠️ That user is not in this server.', ephemeral: true });
  }

  // Prevent kicking admin / self
  if (!member.kickable) {
    return interaction.reply({ content: '⚠️ I do not have permission to kick this member (they may have a higher role).', ephemeral: true });
  }

  try {
    // DM warning first
    await targetUser.send(`⚠️ You have been **kicked** from **${guild.name}**.\n**Reason**: ${reason}`).catch(() => null);
    
    await member.kick(`Kicked by moderator: ${interaction.user.tag}. Reason: ${reason}`);

    // Log action
    await logger.logModAction(client, {
      action: 'KICK',
      targetUser,
      moderator: interaction.user,
      reason
    });

    const embed = new EmbedBuilder()
      .setTitle('👢 Member Kicked')
      .setColor('#ef4444') // Red
      .setDescription(`Successfully kicked **@${targetUser.tag}**.`)
      .addFields(
        { name: 'Target', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Kick command error:', err);
    await interaction.reply({ content: `Failed to kick member: ${err.message}`, ephemeral: true });
  }
}
