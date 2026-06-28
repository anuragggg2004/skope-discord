import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('quiz')
  .setDescription('Administrate the Daily Practice Questions (DPP) system.')
  .addSubcommand(sub => 
    sub.setName('trigger')
       .setDescription('Manually post a random DPP quiz question in the daily quiz channel.')
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

// Static Question Bank
export const questionBank = [
  {
    id: 'q1',
    subject: 'Mathematics (Calculus)',
    question: 'Evaluate the limit as x approaches 0 of `(sin(x) / x)`.',
    options: {
      A: '0',
      B: '1',
      C: 'Infinity',
      D: 'Undefined'
    },
    correct: 'B',
    explanation: 'Using L\'Hopital\'s rule (differentiating numerator and denominator) or standard limits, limit_{x\\to0} \\frac{\\sin(x)}{x} = 1.'
  },
  {
    id: 'q2',
    subject: 'Physics (Electromagnetism)',
    question: 'What is the formula for the magnetic Lorentz force experienced by a charge `q` moving with velocity vector `v` in a magnetic field `B`?',
    options: {
      A: 'F = q(v · B)',
      B: 'F = q(v × B)',
      C: 'F = q(v + B)',
      D: 'F = v(q × B)'
    },
    correct: 'B',
    explanation: 'The magnetic force vector is defined by the vector cross product of velocity and magnetic field: F = q(v × B).'
  },
  {
    id: 'q3',
    subject: 'Chemistry (Periodic Properties)',
    question: 'Which of the following elements has the highest electronegativity value on the Pauling scale?',
    options: {
      A: 'Oxygen (O)',
      B: 'Chlorine (Cl)',
      C: 'Fluorine (F)',
      D: 'Nitrogen (N)'
    },
    correct: 'C',
    explanation: 'Fluorine is the most electronegative element in the periodic table, with a value of 3.98 on the Pauling scale.'
  },
  {
    id: 'q4',
    subject: 'Physics (Mechanics)',
    question: 'A body of mass 2 kg falls freely from a height of 10m. What is its kinetic energy just before hitting the ground? (Use g = 10 m/s²)',
    options: {
      A: '100 Joules',
      B: '200 Joules',
      C: '50 Joules',
      D: '10 Joules'
    },
    correct: 'B',
    explanation: 'By the law of conservation of mechanical energy, Potential Energy loss = Kinetic Energy gain. KE = mgh = 2 kg × 10 m/s² × 10m = 200 Joules.'
  },
  {
    id: 'q5',
    subject: 'Mathematics (Probability)',
    question: 'Three unbiased coins are tossed simultaneously. What is the probability of getting at least two heads?',
    options: {
      A: '1/2',
      B: '3/8',
      C: '5/8',
      D: '3/4'
    },
    correct: 'A',
    explanation: 'The sample space size is 8. Favorable outcomes (at least 2 heads) are: {HHH, HHT, HTH, THH} (4 outcomes). Probability = 4/8 = 1/2.'
  }
];

export async function execute(interaction, client) {
  const quizChannelId = config.channels.dailyQuiz;
  if (!quizChannelId || quizChannelId === '123456789012345678') {
    return interaction.reply({ content: '⚠️ Daily Quiz channel is not configured in `.env`. Please map it first.', ephemeral: true });
  }

  const channel = await client.channels.fetch(quizChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return interaction.reply({ content: '⚠️ Could not resolve daily quiz channel. Verify channel ID.', ephemeral: true });
  }

  // Pick a random question
  const randomIndex = Math.floor(Math.random() * questionBank.length);
  const q = questionBank[randomIndex];

  const embed = new EmbedBuilder()
    .setTitle(`🧠 Skope Daily Quiz — ${q.subject}`)
    .setColor('#3a86ff') // Blue
    .setDescription(
      `**Question**:\n${q.question}\n\n` +
      `**Options**:\n` +
      `• **A**: ${q.options.A}\n` +
      `• **B**: ${q.options.B}\n` +
      `• **C**: ${q.options.C}\n` +
      `• **D**: ${q.options.D}`
    )
    .setFooter({ text: 'Answer correctly to win +10 points! (Single attempt allowed)' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`quiz_answer:A:${q.id}`).setLabel('A').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`quiz_answer:B:${q.id}`).setLabel('B').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`quiz_answer:C:${q.id}`).setLabel('C').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`quiz_answer:D:${q.id}`).setLabel('D').setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ DPP Quiz question triggered and posted successfully!', ephemeral: true });
}
