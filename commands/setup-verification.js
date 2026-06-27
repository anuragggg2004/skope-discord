import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-verification')
  .setDescription('Deploy the student verification panel in the current channel (Staff Only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, client) {
  const embed = new EmbedBuilder()
    .setTitle('🎓 Skope Student Verification')
    .setColor('#4a90e2')
    .setDescription(
      `Welcome to the **Skope Career Discovery Community**!\n\n` +
      `To prevent bots and keep this server a safe, focused environment for Class 12 students, please complete your setup below:\n\n` +
      `**1️⃣ Step 1: Verification**\n` +
      `Click the green **Agree & Verify** button to agree to the rules and receive your **Student** role.\n\n` +
      `**2️⃣ Step 2: Choose Your Stream**\n` +
      `Select your academic stream using the colored buttons to assign your stream role. This will unlock stream-specific discussions!`
    )
    .addFields(
      { name: '📜 Rules Summary', value: '• No advertising or sales pitching\n• No cheating/leak discussions\n• Respect your peers; no toxicity' }
    )
    .setFooter({ text: 'Skope Career Discovery' })
    .setTimestamp();

  const verifyRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_member')
      .setLabel('✅ Agree & Verify')
      .setStyle(ButtonStyle.Success)
  );

  const streamRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('stream_select:science')
      .setLabel('🔬 Science')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('stream_select:commerce')
      .setLabel('📈 Commerce')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('stream_select:arts')
      .setLabel('🎨 Arts / Humanities')
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.reply({ content: 'Deploying verification panel...', ephemeral: true });
  await interaction.channel.send({ embeds: [embed], components: [verifyRow, streamRow] });
}
