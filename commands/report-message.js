import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';
import { logger } from '../services/logger.js';

export const data = new ContextMenuCommandBuilder()
  .setName('Report Message')
  .setType(ApplicationCommandType.Message);

export async function execute(interaction, client) {
  const targetMessage = interaction.targetMessage;
  const reporter = interaction.user;

  // Defer reply because we write to channels
  await interaction.deferReply({ ephemeral: true });

  const modLogsId = config.channels.modLogs;
  if (!modLogsId || modLogsId === '123456789012345678') {
    return interaction.editReply({ content: '⚠️ Moderator logs channel is not configured in `.env`.' });
  }

  const channel = await client.channels.fetch(modLogsId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return interaction.editReply({ content: '⚠️ Could not resolve moderator log channel.' });
  }

  try {
    // 1. Build Moderation Alert Embed
    const alertEmbed = new EmbedBuilder()
      .setTitle('🚨 Message Flagged by Community')
      .setColor('#ff3333') // Red
      .setThumbnail(targetMessage.author.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'Sender / Target', value: `<@${targetMessage.author.id}> (${targetMessage.author.id})`, inline: true },
        { name: 'Flagged By', value: `<@${reporter.id}> (${reporter.id})`, inline: true },
        { name: 'Channel', value: `<#${targetMessage.channelId}>`, inline: true },
        { name: 'Content Preview', value: targetMessage.content ? `\`\`\`\n${targetMessage.content.substring(0, 1000)}\n\`\`\`` : '*No text content (embed/media)*' },
        { name: 'Jump Link', value: `[Jump to Original Message](${targetMessage.url})` }
      )
      .setTimestamp();

    // 2. Action Buttons for Moderators
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_warn_reported:${targetMessage.author.id}`)
        .setLabel('Warn Author')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('⚠️'),
      new ButtonBuilder()
        .setCustomId(`mod_delete_reported:${targetMessage.channelId}:${targetMessage.id}`)
        .setLabel('Delete Message')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId(`create_ticket_override:${targetMessage.author.id}`)
        .setLabel('Open Support Ticket')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔒')
    );

    // 3. Send log
    await channel.send({ embeds: [alertEmbed], components: [row] });

    await interaction.editReply({ 
      content: '✅ **Report Submitted**: Thank you! This message has been flagged to the moderation team for investigation.' 
    });
  } catch (err) {
    console.error('Report Message command error:', err);
    await interaction.editReply({ content: `Failed to submit report: ${err.message}` });
  }
}
