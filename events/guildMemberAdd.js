import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const name = 'guildMemberAdd';
export const once = false;

export async function execute(member, client) {
  logger.info(`New member joined: ${member.user.tag} (${member.id})`);

  // 1. Send welcome message to welcome channel
  if (config.channels.welcome && config.channels.welcome !== 'PLACEHOLDER_WELCOME_CHANNEL') {
    try {
      const welcomeChannel = await client.channels.fetch(config.channels.welcome).catch(() => null);
      if (welcomeChannel && welcomeChannel.isTextBased()) {
        const publicWelcomeEmbed = new EmbedBuilder()
          .setTitle('🎉 New Member Alert!')
          .setColor('#f1c40f')
          .setDescription(`Hi <@${member.id}>! I made Skope so that students like us could have a safe space to figure out our careers without all the stress and pressure.\n\nI've learned so much and made great friends here, and I hope you find the same clarity too!\n\n*(Please check your DMs for a quick onboarding setup!)*`)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
          .setTimestamp();
        
        await welcomeChannel.send({ content: `Welcome <@${member.id}>!`, embeds: [publicWelcomeEmbed] });
      }
    } catch (err) {
      logger.warn(`Could not send public welcome message for ${member.user.tag}: ${err.message}`);
    }
  }

  // 2. Try to send a welcome DM with discovery quiz buttons
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
