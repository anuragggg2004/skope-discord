import { EmbedBuilder } from 'discord.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const name = 'guildMemberAdd';
export const once = false;

export async function execute(member) {
  logger.info(`New member joined: ${member.user.tag} (${member.id})`);

  // Try to send a welcome DM
  try {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎓 Welcome to ${member.guild.name}!`)
      .setColor('#4a90e2')
      .setDescription(
        `Hello ${member.user.username}, welcome to the community!\n\n` +
        `We are an AI-powered career discovery platform designed specifically for Indian Class 12 students.\n\n` +
        `🔒 To unlock the server, please head over to the <#${config.channels.verification}> channel and click the verification buttons. You can also select your stream (Science, Commerce, or Arts) to get custom colored roles!`
      )
      .setFooter({ text: 'Skope Career Discovery Platform' })
      .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] });
  } catch (err) {
    logger.warn(`Could not send welcome DM to ${member.user.tag}: ${err.message}`);
  }
}
