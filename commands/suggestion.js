import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { Suggestion } from '../database/schemas.js';
import { config } from '../config.js';
import { logger } from '../services/logger.js';

export const data = new SlashCommandBuilder()
  .setName('suggestion')
  .setDescription('Manage user suggestions (Staff Only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addSubcommand(subcommand =>
    subcommand
      .setName('approve')
      .setDescription('Approve a suggestion.')
      .addStringOption(option => option.setName('id').setDescription('The Suggestion Message ID').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason/Feedback for approval').setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('decline')
      .setDescription('Decline a suggestion.')
      .addStringOption(option => option.setName('id').setDescription('The Suggestion Message ID').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Reason for declining').setRequired(true)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('review')
      .setDescription('Set a suggestion to Under Consideration/Review.')
      .addStringOption(option => option.setName('id').setDescription('The Suggestion Message ID').setRequired(true))
      .addStringOption(option => option.setName('reason').setDescription('Feedback / details').setRequired(true)));

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();
  const suggestionId = interaction.options.getString('id');
  const reason = interaction.options.getString('reason');
  
  // Find suggestion in database
  const suggestionDoc = await Suggestion.findOne({ suggestionId });
  if (!suggestionDoc) {
    return interaction.reply({ content: 'Could not find a suggestion with that ID in the database.', ephemeral: true });
  }

  const suggestionsChannelId = config.channels.suggestions;
  const channel = await client.channels.fetch(suggestionsChannelId).catch(() => null);
  if (!channel) {
    return interaction.reply({ content: 'Could not find the suggestions channel. Check config.', ephemeral: true });
  }

  const message = await channel.messages.fetch(suggestionId).catch(() => null);
  if (!message) {
    return interaction.reply({ content: 'Could not find the suggestion message in the channel.', ephemeral: true });
  }

  const originalEmbed = message.embeds[0];
  if (!originalEmbed) {
    return interaction.reply({ content: 'The suggestion message has no embed.', ephemeral: true });
  }

  // Update Status in database
  let newStatus = 'pending';
  let color = '#ffcc00';
  let badge = '⏳ Status: Pending Review';
  
  if (subcommand === 'approve') {
    newStatus = 'approved';
    color = '#2ecc71'; // Green
    badge = '✅ Status: Approved & Scheduled';
  } else if (subcommand === 'decline') {
    newStatus = 'declined';
    color = '#e74c3c'; // Red
    badge = '❌ Status: Declined';
  } else if (subcommand === 'review') {
    newStatus = 'under-review';
    color = '#f1c40f'; // Yellow
    badge = '🤔 Status: Under Review';
  }

  suggestionDoc.status = newStatus;
  await suggestionDoc.save();

  // Re-build suggestion embed
  const updatedEmbed = EmbedBuilder.from(originalEmbed)
    .setColor(color)
    .setDescription(originalEmbed.description.replace(/⏳ Status: .+/g, badge).replace(/✅ Status: .+/g, badge).replace(/❌ Status: .+/g, badge).replace(/🤔 Status: .+/g, badge))
    // Clear and re-add fields to include Staff Note
    .setFields(
      { name: 'Status', value: badge, inline: true },
      { name: 'Upvotes', value: `🟢 ${suggestionDoc.upvotes.length}`, inline: true },
      { name: 'Downvotes', value: `🔴 ${suggestionDoc.downvotes.length}`, inline: true },
      { name: 'Staff Note', value: reason || 'No note added' }
    );

  // If approved or declined, we disable the voting buttons
  const originalRow = message.components[0];
  let updatedRow = originalRow;
  
  if (newStatus === 'approved' || newStatus === 'declined') {
    // Disable buttons
    const actionRow = originalRow.toJSON();
    actionRow.components.forEach(comp => {
      comp.disabled = true;
    });
    updatedRow = actionRow;
  }

  await message.edit({ embeds: [updatedEmbed], components: [updatedRow] });

  // Update thread name if exists
  if (suggestionDoc.threadId) {
    const thread = await channel.threads.fetch(suggestionDoc.threadId).catch(() => null);
    if (thread) {
      let emoji = '💬';
      if (newStatus === 'approved') emoji = '✅';
      if (newStatus === 'declined') emoji = '❌';
      if (newStatus === 'under-review') emoji = '🤔';
      
      await thread.setName(`${emoji} Discuss: ${suggestionDoc.title.substring(0, 50)}`).catch(() => null);
    }
  }

  await logger.logModAction(client, {
    action: `SUGGESTION_${newStatus.toUpperCase()}`,
    targetUser: { id: suggestionDoc.userId, tag: suggestionDoc.username },
    moderator: interaction.user,
    reason: reason
  });

  await interaction.reply({ content: `Successfully marked suggestion as **${newStatus}**.`, ephemeral: true });
}
