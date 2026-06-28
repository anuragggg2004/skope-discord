import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { analyzeContent } from '../services/perspective.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';
import { UserWarning } from '../database/schemas.js';

export const data = new SlashCommandBuilder()
  .setName('confess')
  .setDescription('Posts an anonymous academic confession or venting in the confessions channel.')
  .addStringOption(opt => 
    opt.setName('message')
       .setDescription('The confession/message to post anonymously')
       .setRequired(true)
  );

export async function execute(interaction, client) {
  const confessionMessage = interaction.options.getString('message');

  const confessionsChannelId = config.channels.confessions;
  if (!confessionsChannelId || confessionsChannelId === '123456789012345678') {
    return interaction.reply({ content: '⚠️ Confessions channel is not configured in `.env`.', ephemeral: true });
  }

  const channel = await client.channels.fetch(confessionsChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return interaction.reply({ content: '⚠️ Could not resolve confessions channel. Contact administrator.', ephemeral: true });
  }

  // Defer reply because we run API toxicity analysis which can take some time
  await interaction.deferReply({ ephemeral: true });

  try {
    const analysis = await analyzeContent(confessionMessage);

    // 1. Toxicity / Spam Safety Check
    if (analysis.isToxic || analysis.isSpam) {
      // Issue warning
      let userRecord = await UserWarning.findOne({ userId: interaction.user.id });
      if (!userRecord) userRecord = new UserWarning({ userId: interaction.user.id, warnings: [] });
      
      const reason = `Toxicity in anonymous confession submission: ${analysis.reason}`;
      userRecord.warnings.push({
        reason,
        moderatorId: client.user.id,
        timestamp: new Date()
      });
      await userRecord.save();
      
      await logger.logModAction(client, {
        action: 'CONFESSION_BLOCKED',
        targetUser: interaction.user,
        reason
      });

      return interaction.editReply({ 
        content: `❌ **Submission Rejected**: Your confession was blocked by the safety filter for **Toxicity/Spam**.\nReason: ${analysis.reason}\nYou have received a warning.`
      });
    }

    // 2. Severe Stress Safety Check
    if (analysis.isStress) {
      // DM support helplines
      try {
        const supportEmbed = new EmbedBuilder()
          .setTitle('🧡 We are here for you')
          .setColor('#e67e22')
          .setDescription(
            `Hey there, we noticed your confession contains thoughts of stress or self-harm. Please know you are not alone.\n\n` +
            `If you need someone to talk to, here are some free, confidential Indian student helplines:\n` +
            `• **AASRA**: 📞 +91-9820466726 (24/7)\n` +
            `• **Vandrevala Foundation**: 📞 +91-9999666555 (24/7)\n` +
            `• **KIRAN**: 📞 1800-599-0019 (Govt Mental Health Helpline)`
          )
          .setTimestamp();
        await interaction.user.send({ embeds: [supportEmbed] });
      } catch {}

      // Log alert
      const alertEmbed = new EmbedBuilder()
        .setTitle('🚨 Confession Stress Alert')
        .setColor('#ff3333')
        .setDescription(`User <@${interaction.user.id}> submitted a confession containing severe stress flags. Confession was blocked and user was sent support resources.`);
      const modLogChannel = await client.channels.fetch(config.channels.modLogs).catch(() => null);
      if (modLogChannel && modLogChannel.isTextBased()) {
        await modLogChannel.send({ embeds: [alertEmbed] });
      }

      return interaction.editReply({ 
        content: `❌ **Submission Stopped**: Your confession was held for stress-screening and helplines were sent to your DMs.`
      });
    }

    // 3. Post anonymously
    const embed = new EmbedBuilder()
      .setTitle('🤫 Anonymous Confession')
      .setColor('#8338ec') // Purple
      .setDescription(`"${confessionMessage}"`)
      .setFooter({ text: 'Type /confess to share your own venting anonymously' })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    await interaction.editReply({ content: '✅ Your confession has been posted anonymously!' });
  } catch (err) {
    console.error('Confession command error:', err);
    await interaction.editReply({ content: `Failed to process confession: ${err.message}` });
  }
}
