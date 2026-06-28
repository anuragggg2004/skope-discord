import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('exams')
  .setDescription('Lists registration timelines and countdowns for major alternative entrance exams.');

export async function execute(interaction, client) {
  const embed = new EmbedBuilder()
    .setTitle('📅 Entrance Exam Tracker (2027 Cycle)')
    .setColor('#3a86ff') // Blue
    .setDescription(
      `Keep track of key alternative entrance exams beyond JEE/NEET. Don't miss these critical registration deadlines!\n\n` +
      `### 🚀 Exam Schedule & Details:\n` +
      `• **VITEEE (Vellore Institute)**\n` +
      `  - *Registration*: Nov 2026 – Mar 2027\n` +
      `  - *Exam Date*: Mid-April 2027\n\n` +
      `• **BITSAT (BITS Pilani)**\n` +
      `  - *Registration*: Jan 2027 – Apr 2027\n` +
      `  - *Exam Date*: Mid-May 2027 (Session 1)\n\n` +
      `• **UGEE (IIIT Hyderabad)**\n` +
      `  - *Registration*: Feb 2027 – Apr 2027\n` +
      `  - *Exam Date*: Early May 2027\n\n` +
      `• **CUET-UG (Central Universities)**\n` +
      `  - *Registration*: Feb 2027 – Mar 2027\n` +
      `  - *Exam Date*: Mid-May 2027\n\n` +
      `• **IPMAT (IIM Indore/Rohtak)**\n` +
      `  - *Registration*: Feb 2027 – Apr 2027\n` +
      `  - *Exam Date*: Late May 2027\n\n` +
      `• **COMEDK UGET (Karnataka Engineering)**\n` +
      `  - *Registration*: Feb 2027 – Apr 2027\n` +
      `  - *Exam Date*: Mid-May 2027`
    )
    .setFooter({ text: 'Sync details and review full colleges matching guide on Skope platform!' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Exams Guide on Skope')
      .setStyle(ButtonStyle.Link)
      .setURL(`${config.websiteUrl}/exams`)
      .setEmoji('🚀')
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}
