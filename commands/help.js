import { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} from 'discord.js';
import { config } from '../config.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Displays a sleek, interactive portal menu of all available commands.');

export async function execute(interaction, client) {
  const prefix = config.prefix || '!';
  const botUser = client.user;
  const botAvatar = botUser.displayAvatarURL({ dynamic: true });

  // 1. Initial/Default welcome Embed
  const welcomeEmbed = new EmbedBuilder()
    .setTitle('⚡ SKOPE Portal Hub')
    .setColor('#3a86ff') // Vibrant neon blue
    .setThumbnail(botAvatar)
    .setDescription(
      `Hello <@${interaction.user.id}>! Welcome to the modern **Skope Portal Hub**.\n\n` +
      `Use the **dropdown select menu** below to navigate through command groups and explore bot features. You can run commands using Slash (\`/\`) or message prefix (\`${prefix}\`).`
    )
    .addFields(
      {
        name: '🌐 Dashboard Access',
        value: `Inspect live logs, AI filters, database stats, and controls at our premium [Web Developer Portal](http://localhost:3001/).`
      },
      {
        name: '💡 Quick Tip',
        value: `If you need private assistance from staff, go ahead and select **Student & Core Utilities** below and trigger the \`/report\` command.`
      }
    )
    .setFooter({ text: 'Skope Career Discovery Community • Select a category below', iconURL: botAvatar })
    .setTimestamp();

  // 2. Select Menu Options
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('help_menu_select')
    .setPlaceholder('📂 Select Command Category...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Student & Core Utilities')
        .setDescription('General commands, suggestion boxes, and ticketing support.')
        .setValue('help_student')
        .setEmoji('👤'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Staff Moderation Tools')
        .setDescription('Warn users, mutes/timeouts, and suggestion review actions.')
        .setValue('help_staff')
        .setEmoji('🛡️'),
      new StringSelectMenuOptionBuilder()
        .setLabel('Admin Server Setup')
        .setDescription('Initialize verification panels, support ticket boxes, and broadcasts.')
        .setValue('help_admin')
        .setEmoji('⚙️')
    );

  // 3. Row Builders
  const rowMenu = new ActionRowBuilder().addComponents(selectMenu);

  const btnDashboard = new ButtonBuilder()
    .setLabel('Open Developer Portal')
    .setStyle(ButtonStyle.Link)
    .setURL('http://localhost:3001/')
    .setEmoji('🌐');

  const btnWebsite = new ButtonBuilder()
    .setLabel('Visit Career Platform')
    .setStyle(ButtonStyle.Link)
    .setURL(config.websiteUrl)
    .setEmoji('🚀');

  const rowButtons = new ActionRowBuilder().addComponents(btnDashboard, btnWebsite);

  // 4. Send Initial Message
  const replyMessage = await interaction.reply({
    embeds: [welcomeEmbed],
    components: [rowMenu, rowButtons],
    fetchReply: true
  });

  // 5. Create Component Collector for Page switching
  const collector = replyMessage.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 120000 // 2 minutes interaction window
  });

  collector.on('collect', async (i) => {
    if (!i.isStringSelectMenu()) return;
    
    await i.deferUpdate();

    let categoryEmbed;
    
    if (i.values[0] === 'help_student') {
      categoryEmbed = new EmbedBuilder()
        .setTitle('👤 Student & Core Utilities')
        .setColor('#3a86ff')
        .setThumbnail(botAvatar)
        .setDescription('These commands are available to all students and members of the community.')
        .addFields(
          {
            name: `\`${prefix}help\`  or  \`/help\``,
            value: `Displays this sleek interactive help portal with all command documentation.`
          },
          {
            name: `\`${prefix}status\`  or  \`/status\``,
            value: `Displays system vitals, bot uptime, API database socket connections latency, and warnings cache.`
          },
          {
            name: `\`${prefix}suggest\`  or  \`/suggest\``,
            value: `Opens an interactive form popup to submit structural suggestions for server upgrades.`
          },
          {
            name: `\`${prefix}report\`  or  \`/report\``,
            value: `Creates a confidential private ticketing text channel directly connecting you to Skope moderators.`
          },
          {
            name: `\`${prefix}website\`  or  \`/website\``,
            value: `Displays details and direct access links for the Skope Career Discovery Platform.`
          }
        )
        .setFooter({ text: 'Category: Student Utilities • Skope Bot', iconURL: botAvatar })
        .setTimestamp();
    }
    
    else if (i.values[0] === 'help_staff') {
      categoryEmbed = new EmbedBuilder()
        .setTitle('🛡️ Staff Moderation Tools')
        .setColor('#ffbe0b') // Amber/Yellow
        .setThumbnail(botAvatar)
        .setDescription('These commands are restricted to moderators, administrators, and help staff.')
        .addFields(
          {
            name: `\`${prefix}warn\`  or  \`${prefix}timeout\``,
            value: `Issue warnings or apply temporary timeouts/mutes to rule violators.`
          },
          {
            name: `\`${prefix}kick\`  or  \`${prefix}ban\`  or  \`${prefix}softban\``,
            value: `Kick, ban, or softban (kick and purge 7-day chat history) a user.`
          },
          {
            name: `\`${prefix}lock\`  or  \`${prefix}unlock\``,
            value: `Locks/unlocks everyone's send messages permissions in the current channel.`
          },
          {
            name: `\`${prefix}purge <amount>\`  or  \`${prefix}slowmode <seconds>\``,
            value: `Bulk delete messages (1-100) or change channel message cooldown rates.`
          },
          {
            name: `\`${prefix}suggestion <approve|decline|review> <id> <reason>\``,
            value: `Updates voting suggestions statuses and notifies authors.`
          }
        )
        .setFooter({ text: 'Category: Staff Moderation • Skope Bot', iconURL: botAvatar })
        .setTimestamp();
    }
    
    else if (i.values[0] === 'help_admin') {
      categoryEmbed = new EmbedBuilder()
        .setTitle('⚙️ Admin Server Setup')
        .setColor('#8338ec') // Purple
        .setThumbnail(botAvatar)
        .setDescription('These commands allow developers and owners to configure bot integrations.')
        .addFields(
          {
            name: `\`${prefix}setup-verification\`  or  \`/setup-verification\``,
            value: `Spawns the dual-panel student verification welcome widget and colored stream role select selector.`
          },
          {
            name: `\`${prefix}setup-support\`  or  \`/setup-support\``,
            value: `Spawns the ModMail support center widget to allow users to open support tickets with a single click.`
          },
          {
            name: `\`${prefix}setup-feedback-panels\`  or  \`/setup-feedback-panels\``,
            value: `Deploys feedback cards, bug trackers (with developer investigate buttons), or feature suggestion grids.`
          },
          {
            name: `\`${prefix}announce\`  or  \`/announce\``,
            value: `Triggers a rich-text announcement editor modal to broadcast updates across text channels.`
          }
        )
        .setFooter({ text: 'Category: Server Administration • Skope Bot', iconURL: botAvatar })
        .setTimestamp();
    }

    // Update the message with the new selected category embed
    await i.editReply({ embeds: [categoryEmbed] }).catch(() => null);
  });

  // End of interaction window: disable dropdown
  collector.on('end', async () => {
    const disabledMenu = new StringSelectMenuBuilder()
      .setCustomId('help_menu_select_disabled')
      .setPlaceholder('⌛ Interaction expired. Run /help again.')
      .setDisabled(true)
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Expired')
          .setValue('expired')
      );
    const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
    
    await interaction.editReply({ components: [disabledRow, rowButtons] }).catch(() => null);
  });
}
