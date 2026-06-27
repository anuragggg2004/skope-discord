import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('setup-support')
  .setDescription('Deploy the ModMail support panel in the current channel (Staff Only).')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction, client) {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Contact Server Support & ModMail')
    .setColor('#e74c3c')
    .setDescription(
      `Need support? Report bullying, harassment, spam, coaching class recruiters, or ask questions privately to the moderator staff.\n\n` +
      `Click the button below to create a **Private Support Ticket**. A private text channel will be created instantly for you and the moderators.`
    )
    .setFooter({ text: 'Skope Care & Moderation System' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_ticket_btn')
      .setLabel('🎫 Create Support Ticket')
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ content: 'Deploying support panel...', ephemeral: true });
  await interaction.channel.send({ embeds: [embed], components: [row] });
}
