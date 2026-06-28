import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const name = 'guildMemberAdd';
export const once = false;

export async function execute(member) {
  logger.info(`New member joined: ${member.user.tag} (${member.id})`);

  // Try to send a welcome DM with discovery quiz buttons
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎓 Welcome to ${member.guild.name}!`)
      .setColor('#4a90e2')
      .setDescription(
        `Hello ${member.user.username}, welcome to the community!\n\n` +
        `We are an AI-powered career discovery platform designed specifically for Indian Class 12 students.\n\n` +
        `To personalize your experience, please let us know your current stream/goal:`
      )
      .setFooter({ text: 'Skope Career Discovery Platform' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('stream_select:science')
        .setLabel('🔬 Science (JEE/NEET)')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('stream_select:commerce')
        .setLabel('📈 Commerce (CA/CS/CUET)')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('stream_select:arts')
        .setLabel('🎨 Arts / Humanities')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('stream_select:foundation')
        .setLabel('📚 Foundation (9th/10th)')
        .setStyle(ButtonStyle.Secondary)
    );

    await member.send({ embeds: [welcomeEmbed], components: [row] });
  } catch (err) {
    logger.warn(`Could not send welcome DM to ${member.user.tag}: ${err.message}`);
  }
}
