import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('setup-feedback-panels')
  .setDescription('Deploy the feedback, bugs, or feature requests panel in the current channel (Staff Only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, client) {
  const channelId = interaction.channelId;

  // Check which panel to deploy based on the current channel ID
  if (channelId === config.channels.feedback) {
    const embed = new EmbedBuilder()
      .setTitle('💬 Skope Student Feedback')
      .setColor('#2ecc71') // Green
      .setDescription(
        `Your feedback helps us make the Skope career platform better for everyone!\n\n` +
        `Click the **Submit Feedback** button below to share your experience, ratings, and thoughts with our development team.`
      )
      .setFooter({ text: 'Skope Career Discovery Platform' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('feedback_submit_btn')
        .setLabel('💬 Submit Feedback')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({ content: 'Deploying student feedback panel...', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return;
  }

  if (channelId === config.channels.bugs) {
    const embed = new EmbedBuilder()
      .setTitle('🐛 Report a Bug / Technical Issue')
      .setColor('#e74c3c') // Red
      .setDescription(
        `Did something break, or did you run into a technical issue on the Skope website or bot?\n\n` +
        `Click the **Report a Bug** button below to submit a bug report. Please include steps to reproduce the issue so our developers can resolve it quickly.`
      )
      .setFooter({ text: 'Skope Bug Tracking System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('bug_submit_btn')
        .setLabel('🐛 Report a Bug')
        .setStyle(ButtonStyle.Danger)
    );

    await interaction.reply({ content: 'Deploying bug report panel...', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return;
  }

  if (channelId === config.channels.featureRequests) {
    const embed = new EmbedBuilder()
      .setTitle('💡 Request a Feature')
      .setColor('#3498db') // Blue
      .setDescription(
        `Do you have an idea for a feature or tool that would help you in your Class 12 studies or career counseling?\n\n` +
        `Click the **Submit Feature Request** button below to share your idea. Other community members will be able to upvote or downvote the request!`
      )
      .setFooter({ text: 'Skope Feature Voting System' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('feature_submit_btn')
        .setLabel('💡 Submit Feature Request')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ content: 'Deploying feature request panel...', ephemeral: true });
    await interaction.channel.send({ embeds: [embed], components: [row] });
    return;
  }

  // If not in the three channels
  const configuredChannelsMessage = 
    `This command can only be deployed in the designated feedback, bugs, or feature-requests channels.\n\n` +
    `• **Feedback**: <#${config.channels.feedback || 'Not Configured'}>\n` +
    `• **Bugs**: <#${config.channels.bugs || 'Not Configured'}>\n` +
    `• **Feature Requests**: <#${config.channels.featureRequests || 'Not Configured'}>`;

  await interaction.reply({ content: configuredChannelsMessage, ephemeral: true });
}
