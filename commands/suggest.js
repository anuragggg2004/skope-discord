import { 
  SlashCommandBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('suggest')
  .setDescription('Submit a suggestion or feedback for Skope.');

export async function execute(interaction, client) {
  const modal = new ModalBuilder()
    .setCustomId('suggestion_modal')
    .setTitle('📥 Submit a Suggestion');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g., Add practice papers for IISER IAT')
    .setRequired(true)
    .setMaxLength(100);

  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Detailed Description')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Describe your suggestion. Why would this be helpful?')
    .setRequired(true)
    .setMaxLength(1000);

  const firstRow = new ActionRowBuilder().addComponents(titleInput);
  const secondRow = new ActionRowBuilder().addComponents(descInput);

  modal.addComponents(firstRow, secondRow);

  await interaction.showModal(modal);
}
