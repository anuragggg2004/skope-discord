import { 
  SlashCommandBuilder, 
  ChannelType, 
  PermissionFlagsBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { Ticket } from '../database/schemas.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('report')
  .setDescription('Open a private ModMail ticket to report bullying/harassment or contact staff.');

export async function execute(interaction, client) {
  const guild = interaction.guild;
  const user = interaction.user;

  // Check if ticket category exists
  const categoryId = config.categories.tickets;
  const category = guild.channels.cache.get(categoryId);
  if (!category || category.type !== ChannelType.GuildCategory) {
    return interaction.reply({ 
      content: 'Ticket system is not fully configured (missing category). Please contact staff.', 
      ephemeral: true 
    });
  }

  // Check if user already has an open ticket
  const existingTicket = await Ticket.findOne({ userId: user.id, status: 'open' });
  if (existingTicket) {
    return interaction.reply({ 
      content: `You already have an open ticket: <#${existingTicket.channelId}>. Please use that channel.`, 
      ephemeral: true 
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // Create new ticket channel
    const channelName = `ticket-${user.username.replace(/[^a-zA-Z0-9]/g, '')}`.substring(0, 32);
    
    const permissionOverwrites = [
      {
        id: guild.id, // @everyone
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id, // The ticket creator
        allow: [
          PermissionFlagsBits.ViewChannel, 
          PermissionFlagsBits.SendMessages, 
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ],
      }
    ];

    // Add Staff Role permissions
    if (config.roles.staff && config.roles.staff !== '123456789012345678') {
      permissionOverwrites.push({
        id: config.roles.staff,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: category.id,
      permissionOverwrites: permissionOverwrites
    });

    // Save ticket in Database
    const ticketDoc = new Ticket({
      channelId: ticketChannel.id,
      userId: user.id,
      username: user.tag,
      status: 'open'
    });
    await ticketDoc.save();

    // Send introduction embed in the ticket channel
    const introEmbed = new EmbedBuilder()
      .setTitle('🎫 Private Support Ticket')
      .setColor('#3498db')
      .setDescription(`Welcome <@${user.id}>! Staff has been notified and will be here to assist you shortly.`)
      .addFields(
        { name: 'Reporter', value: `${user.tag} (${user.id})` },
        { name: 'Guidelines', value: 'Please describe the issue or report in detail. If reporting bullying, provide screenshots or message links if possible.' }
      )
      .setFooter({ text: 'To close this ticket, staff can use the button below or type /close.' })
      .setTimestamp();

    const closeButton = new ButtonBuilder()
      .setCustomId(`close_ticket:${ticketChannel.id}`)
      .setLabel('🔒 Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await ticketChannel.send({ embeds: [introEmbed], components: [row] });
    
    // Alert staff log
    const staffEmbed = new EmbedBuilder()
      .setTitle('🎫 Ticket Created')
      .setColor('#3498db')
      .setDescription(`User <@${user.id}> (${user.tag}) opened a new ticket: <#${ticketChannel.id}>`)
      .setTimestamp();
      
    const logChannel = await guild.channels.fetch(config.channels.modLogs).catch(() => null);
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send({ embeds: [staffEmbed] });
    }

    await interaction.editReply({ 
      content: `Ticket created successfully! Please proceed to <#${ticketChannel.id}>.` 
    });

  } catch (err) {
    console.error('Error creating ticket channel:', err);
    await interaction.editReply({ 
      content: `Failed to create ticket channel: ${err.message}` 
    });
  }
}
