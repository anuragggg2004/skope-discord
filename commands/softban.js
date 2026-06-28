import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { logger } from '../services/logger.js';

export const data = new SlashCommandBuilder()
  .setName('softban')
  .setDescription('Bans and immediately unbans a member to clear all their message history.')
  .addUserOption(opt => 
    opt.setName('user')
       .setDescription('The member to softban')
       .setRequired(true)
  )
  .addStringOption(opt => 
    opt.setName('reason')
       .setDescription('Reason for the softban')
       .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction, client) {
  const targetUser = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  const guild = interaction.guild;

  const member = await guild.members.fetch(targetUser.id).catch(() => null);

  if (member && !member.bannable) {
    return interaction.reply({ content: '⚠️ I do not have permission to softban this member.', ephemeral: true });
  }

  try {
    // DM warning first
    await targetUser.send(`⚠️ You have been **softbanned** from **${guild.name}** (kicked and chat cleared).\n**Reason**: ${reason}`).catch(() => null);

    // Ban and delete 7 days of messages
    await guild.bans.create(targetUser.id, {
      deleteMessageSeconds: 7 * 24 * 60 * 60,
      reason: `Softban delete messages: ${interaction.user.tag}. Reason: ${reason}`
    });

    // Unban immediately
    await guild.bans.remove(targetUser.id, `Softban release: ${interaction.user.tag}`);

    // Log action
    await logger.logModAction(client, {
      action: 'SOFTBAN',
      targetUser,
      moderator: interaction.user,
      reason
    });

    const embed = new EmbedBuilder()
      .setTitle('💨 Member Softbanned')
      .setColor('#ff9900') // Orange
      .setDescription(`Successfully softbanned **@${targetUser.tag}** (kicked and cleared 7 days of message history).`)
      .addFields(
        { name: 'Target', value: `<@${targetUser.id}>`, inline: true },
        { name: 'Moderator', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Reason', value: reason }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Softban error:', err);
    await interaction.reply({ content: `Failed to softban user: ${err.message}`, ephemeral: true });
  }
}
