import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('website')
  .setDescription('Displays information and access links for the Skope Career Discovery Platform.');

export async function execute(interaction, client) {
  const webUrl = config.websiteUrl;
  const renderUrl = config.websiteRenderUrl;

  const embed = new EmbedBuilder()
    .setTitle('🌐 Skope Career Discovery Platform')
    .setColor('#3a86ff') // Blue
    .setDescription(
      `**Skope** is an AI-powered counseling and college matchmaker platform built specifically for Indian Class 12 students preparing for entrance exams (JEE/NEET and alternatives).\n\n` +
      `### 🚀 Platform Features:\n` +
      `• **AI PathReports**: Get tailored career roadmaps, college matches, and timelines based on stream choices, target city, and budget.\n` +
      `• **Hidden Gems**: Unlock 20+ top-tier colleges offering excellent placements without requiring ultra-competitive JEE/NEET ranks.\n` +
      `• **Alternative Entrance Exams**: Discover 12+ other options to guarantee fallback admissions.\n` +
      `• **Niche Career Paths**: Learn about non-traditional, high-paying career tracks.`
    )
    .addFields(
      {
        name: '🌐 Live Web Platform (Custom Domain)',
        value: `**[anuraggg.tech](${webUrl})**`,
        inline: true
      },
      {
        name: '⚡ Alternative Mirror (Render)',
        value: `**[skope-77eq.onrender.com](${renderUrl})**`,
        inline: true
      }
    )
    .setFooter({ text: 'Find your career scope with Skope!' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Visit Skope Platform')
      .setStyle(ButtonStyle.Link)
      .setURL(webUrl)
      .setEmoji('🚀'),
    new ButtonBuilder()
      .setLabel('Developer Portal')
      .setStyle(ButtonStyle.Link)
      .setURL('http://localhost:3001/')
      .setEmoji('⚙️')
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
