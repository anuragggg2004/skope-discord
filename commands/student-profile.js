import { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { UserWarning, QuizScore } from '../database/schemas.js';

export const data = new ContextMenuCommandBuilder()
  .setName('Student Profile')
  .setType(ApplicationCommandType.User);

export async function execute(interaction, client) {
  const targetUser = interaction.targetUser;
  const guildMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (targetUser.bot) {
    return interaction.reply({ content: '🤖 Bots do not have student profiles!', ephemeral: true });
  }

  // Defer reply since we perform database queries
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Fetch data from DB
    const warningRecord = await UserWarning.findOne({ userId: targetUser.id });
    const quizRecord = await QuizScore.findOne({ userId: targetUser.id });

    // 2. Map Verification & Warnings
    const isVerified = warningRecord ? warningRecord.verified : false;
    const warningCount = warningRecord ? (warningRecord.warnings?.length || 0) : 0;
    const stream = warningRecord ? (warningRecord.stream || 'None Selected') : 'None Selected';

    // 3. Map Quiz Stats
    const score = quizRecord ? quizRecord.score : 0;
    const correct = quizRecord ? quizRecord.correctAnswers : 0;
    const total = quizRecord ? quizRecord.totalAnswered : 0;
    const streak = quizRecord ? quizRecord.streak : 0;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // 4. Build Embed Card
    const embed = new EmbedBuilder()
      .setTitle(`📇 Student Profile — @${targetUser.username}`)
      .setColor('#3a86ff') // Blue
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setDescription(
        `Academic and community metrics for <@${targetUser.id}> inside **${interaction.guild.name}**.`
      )
      .addFields(
        {
          name: '🛡️ Verification & Safety',
          value: 
            `• Status: ${isVerified ? 'Verified **Student** ✅' : 'Unverified Member ❌'}\n` +
            `• Stream: **${stream}**\n` +
            `• Warnings: **${warningCount}/5**`,
          inline: false
        },
        {
          name: '🧠 Daily Practice Quiz (DPP)',
          value: 
            `• Total Score: **${score} pts**\n` +
            `• Accuracy: **${accuracy}%** (${correct}/${total} correct)\n` +
            `• Active Streak: **${streak} correct** 🔥`,
          inline: false
        }
      )
      .setFooter({ text: 'Skope Career Discovery Platform' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('Student Profile Context Menu Error:', err);
    await interaction.editReply({ content: `Failed to load student profile: ${err.message}` });
  }
}
