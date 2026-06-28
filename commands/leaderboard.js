import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { QuizScore } from '../database/schemas.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Displays the top 10 students ranked by daily quiz scores.');

export async function execute(interaction, client) {
  try {
    // Fetch top 10 from MongoDB
    const topScores = await QuizScore.find({})
      .sort({ score: -1 })
      .limit(10);

    const embed = new EmbedBuilder()
      .setTitle('🏆 Skope Quiz Leaderboard')
      .setColor('#f59e0b') // Amber/Yellow
      .setDescription('Rankings of top students based on Daily Practice Questions (DPP) scores.')
      .setTimestamp();

    if (topScores.length === 0) {
      embed.setDescription('No students have answered daily questions yet! Be the first one.');
    } else {
      let ranksText = '';
      topScores.forEach((score, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '👤';
        ranksText += `${medal} **#${idx + 1}** <@${score.userId}> — **${score.score} pts** (${score.correctAnswers}/${score.totalAnswered} correct, Streak: **${score.streak}**🔥)\n`;
      });
      embed.addFields({ name: 'Top Achievers', value: ranksText });
    }

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Leaderboard error:', err);
    await interaction.reply({ content: `Failed to load leaderboard: ${err.message}`, ephemeral: true });
  }
}
