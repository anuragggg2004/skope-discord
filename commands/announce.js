import { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder 
} from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Create a styled announcement embed via a popup modal.')
  .addChannelOption(option => 
    option.setName('channel')
      .setDescription('Channel to post the announcement in (defaults to current channel)')
      .setRequired(false))
  .addStringOption(option => 
    option.setName('mention')
      .setDescription('Who to mention with this announcement')
      .setRequired(false)
      .addChoices(
        { name: 'None', value: 'none' },
        { name: '@everyone', value: 'everyone' },
        { name: 'Student Role', value: 'student' }
      ))
  .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone);

export async function execute(interaction, client) {
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  const mention = interaction.options.getString('mention') || 'none';
  
  // Custom ID contains: announce_modal:[channelId]:[mentionType]
  const customId = `announce_modal:${channel.id}:${mention}`;
  
  const modal = new ModalBuilder()
    .setCustomId(customId)
    .setTitle('📢 Create Announcement');

  const titleInput = new TextInputBuilder()
    .setCustomId('title')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter the announcement title...')
    .setRequired(true)
    .setMaxLength(256);

  const descInput = new TextInputBuilder()
    .setCustomId('description')
    .setLabel('Announcement Body (Markdown supported)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter the main body of the announcement...')
    .setRequired(true)
    .setMaxLength(4000);

  const imgInput = new TextInputBuilder()
    .setCustomId('image_url')
    .setLabel('Optional Image URL')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('https://example.com/image.png')
    .setRequired(false);

  const firstRow = new ActionRowBuilder().addComponents(titleInput);
  const secondRow = new ActionRowBuilder().addComponents(descInput);
  const thirdRow = new ActionRowBuilder().addComponents(imgInput);

  modal.addComponents(firstRow, secondRow, thirdRow);

  await interaction.showModal(modal);
}
