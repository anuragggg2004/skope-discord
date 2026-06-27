import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ChannelType, 
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import { UserWarning, Suggestion, Ticket, BugReport, FeatureRequest } from '../database/schemas.js';
import { config } from '../config.js';
import { logger } from '../services/logger.js';

export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction, client) {
  // 1. Handle Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await logger.logCommand(client, interaction);
      await command.execute(interaction, client);
    } catch (error) {
      logger.logDiscordError(client, `Error executing command /${interaction.commandName}`, error);
      const errResponse = { content: 'There was an error while executing this command!', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(errResponse).catch(() => null);
      } else {
        await interaction.reply(errResponse).catch(() => null);
      }
    }
    return;
  }

  // 2. Handle Buttons
  if (interaction.isButton()) {
    const customId = interaction.customId;
    const guild = interaction.guild;
    const member = interaction.member;

    // A. Smart Student Verification
    if (customId === 'verify_member') {
      const studentRoleId = config.roles.student;
      if (!studentRoleId || studentRoleId === '123456789012345678') {
        return interaction.reply({ content: 'Student role is not configured. Please contact staff.', ephemeral: true });
      }

      if (member.roles.cache.has(studentRoleId)) {
        return interaction.reply({ content: 'You are already verified as a Student!', ephemeral: true });
      }

      try {
        await member.roles.add(studentRoleId);
        
        // Save verification status in DB
        let userRec = await UserWarning.findOne({ userId: member.id });
        if (!userRec) userRec = new UserWarning({ userId: member.id });
        userRec.verified = true;
        await userRec.save();

        await interaction.reply({ 
          content: '🎉 **Verification Successful!** You have been assigned the **Student** role. You can now select your academic Stream (Science, Commerce, Arts) to unlock matching channels.', 
          ephemeral: true 
        });
      } catch (err) {
        logger.error(`Error verifying member ${member.user.tag}`, err);
        await interaction.reply({ content: `Failed to assign Student role: ${err.message}`, ephemeral: true });
      }
      return;
    }

    // B. Stream Selection Roles
    if (customId.startsWith('stream_select:')) {
      const stream = customId.split(':')[1]; // science, commerce, arts
      const studentRoleId = config.roles.student;

      if (!member.roles.cache.has(studentRoleId)) {
        return interaction.reply({ content: '⚠️ Please complete Step 1 (verification) first to get the Student role.', ephemeral: true });
      }

      // Map roles
      const roleMap = {
        science: config.roles.science,
        commerce: config.roles.commerce,
        arts: config.roles.arts
      };

      const targetRoleId = roleMap[stream];
      if (!targetRoleId || targetRoleId === '123456789012345678') {
        return interaction.reply({ content: `The role for ${stream} stream is not configured. Contact staff.`, ephemeral: true });
      }

      try {
        await interaction.deferReply({ ephemeral: true });

        // Remove other stream roles to avoid duplicates
        const rolesToRemove = Object.keys(roleMap)
          .filter(k => k !== stream)
          .map(k => roleMap[k])
          .filter(id => id && id !== '123456789012345678');

        for (const roleId of rolesToRemove) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
          }
        }

        // Add selected stream role
        await member.roles.add(targetRoleId);

        // Update in MongoDB
        let userRec = await UserWarning.findOne({ userId: member.id });
        if (!userRec) userRec = new UserWarning({ userId: member.id });
        userRec.stream = stream.toUpperCase();
        await userRec.save();

        await interaction.editReply({ 
          content: `✅ Your stream has been set to **${stream.toUpperCase()}**. Stream-specific channels have been unlocked!` 
        });
      } catch (err) {
        logger.error(`Error setting stream role for ${member.user.tag}`, err);
        await interaction.editReply({ content: `Failed to update roles: ${err.message}` });
      }
      return;
    }

    // C. Support Ticketing Button
    if (customId === 'create_ticket_btn') {
      // Re-use logic from /report command
      const reportCommand = client.commands.get('report');
      if (reportCommand) {
        await reportCommand.execute(interaction, client);
      } else {
        await interaction.reply({ content: 'Ticketing service is currently unavailable.', ephemeral: true });
      }
      return;
    }

    // D. Close Support Ticket Button
    if (customId.startsWith('close_ticket:')) {
      const channelId = customId.split(':')[1];
      const ticketChannel = guild.channels.cache.get(channelId);

      // Staff only or Ticket Owner can close
      const isStaff = member.roles.cache.has(config.roles.staff) || member.permissions.has(PermissionFlagsBits.ManageChannels);
      
      const ticketDoc = await Ticket.findOne({ channelId, status: 'open' });
      const isOwner = ticketDoc && ticketDoc.userId === member.id;

      if (!isStaff && !isOwner) {
        return interaction.reply({ content: 'You do not have permission to close this ticket.', ephemeral: true });
      }

      await interaction.reply({ content: '⚙️ Closing ticket channel... This channel will be deleted in 5 seconds.' });

      // Save close status
      if (ticketDoc) {
        ticketDoc.status = 'closed';
        ticketDoc.closedAt = new Date();
        ticketDoc.closedBy = member.user.tag;
        await ticketDoc.save();
      }

      // Log closure
      const closeEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket Closed')
        .setColor('#e74c3c')
        .setDescription(`Ticket channel \`${ticketChannel?.name || channelId}\` closed by @${member.user.tag}`)
        .addFields(
          { name: 'Opened By', value: ticketDoc ? `<@${ticketDoc.userId}> (${ticketDoc.username})` : 'Unknown', inline: true },
          { name: 'Closed By', value: `<@${member.id}>`, inline: true }
        )
        .setTimestamp();

      const modLogChannel = await client.channels.fetch(config.channels.modLogs).catch(() => null);
      if (modLogChannel && modLogChannel.isTextBased()) {
        await modLogChannel.send({ embeds: [closeEmbed] });
      }

      // Delete Channel after 5 seconds
      setTimeout(async () => {
        await ticketChannel?.delete().catch(() => null);
      }, 5000);
      return;
    }

    // E. Suggestions Upvote/Downvote live buttons
    if (customId.startsWith('vote_upvote:') || customId.startsWith('vote_downvote:')) {
      const type = customId.startsWith('vote_upvote:') ? 'up' : 'down';
      const sugMessageId = customId.split(':')[1];
      const voterId = interaction.user.id;

      const suggestionDoc = await Suggestion.findOne({ suggestionId: sugMessageId });
      if (!suggestionDoc) {
        return interaction.reply({ content: 'Suggestion record not found in database.', ephemeral: true });
      }

      // Prevent author from voting on their own suggestion
      if (suggestionDoc.userId === voterId) {
        return interaction.reply({ content: '❌ You cannot vote on your own suggestion!', ephemeral: true });
      }

      // Toggle votes logic
      if (type === 'up') {
        if (suggestionDoc.upvotes.includes(voterId)) {
          // Remove upvote
          suggestionDoc.upvotes = suggestionDoc.upvotes.filter(id => id !== voterId);
        } else {
          // Add upvote, remove downvote if exists
          suggestionDoc.upvotes.push(voterId);
          suggestionDoc.downvotes = suggestionDoc.downvotes.filter(id => id !== voterId);
        }
      } else {
        if (suggestionDoc.downvotes.includes(voterId)) {
          // Remove downvote
          suggestionDoc.downvotes = suggestionDoc.downvotes.filter(id => id !== voterId);
        } else {
          // Add downvote, remove upvote if exists
          suggestionDoc.downvotes.push(voterId);
          suggestionDoc.upvotes = suggestionDoc.upvotes.filter(id => id !== voterId);
        }
      }

      await suggestionDoc.save();

      // Edit suggestion embed and buttons with updated counts
      const originalEmbed = interaction.message.embeds[0];
      const originalRow = interaction.message.components[0];
      
      const badge = suggestionDoc.status === 'pending' ? '⏳ Status: Pending Review' :
                    suggestionDoc.status === 'approved' ? '✅ Status: Approved & Scheduled' :
                    suggestionDoc.status === 'declined' ? '❌ Status: Declined' :
                    '🤔 Status: Under Review';

      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setFields(
          { name: 'Status', value: badge, inline: true },
          { name: 'Upvotes', value: `🟢 ${suggestionDoc.upvotes.length}`, inline: true },
          { name: 'Downvotes', value: `🔴 ${suggestionDoc.downvotes.length}`, inline: true }
        );
      
      // If staff note existed, keep it
      const staffField = originalEmbed.fields.find(f => f.name === 'Staff Note');
      if (staffField) {
        updatedEmbed.addFields({ name: 'Staff Note', value: staffField.value });
      }

      // Update button labels with updated totals
      const updatedButtonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_upvote:${sugMessageId}`)
          .setLabel(`Upvote (${suggestionDoc.upvotes.length})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(suggestionDoc.status === 'approved' || suggestionDoc.status === 'declined'),
        new ButtonBuilder()
          .setCustomId(`vote_downvote:${sugMessageId}`)
          .setLabel(`Downvote (${suggestionDoc.downvotes.length})`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(suggestionDoc.status === 'approved' || suggestionDoc.status === 'declined')
      );

      await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtonsRow] });
      await interaction.reply({ content: `Your vote has been updated. (Current Score: +${suggestionDoc.upvotes.length - suggestionDoc.downvotes.length})`, ephemeral: true });
      return;
    }

    // F. Feedback Submit Button
    if (customId === 'feedback_submit_btn') {
      const modal = new ModalBuilder()
        .setCustomId('feedback_modal')
        .setTitle('💬 Submit Feedback');

      const ratingInput = new TextInputBuilder()
        .setCustomId('rating')
        .setLabel('Rating (1 to 5 Stars)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter a number from 1 to 5')
        .setRequired(true)
        .setMaxLength(1);

      const lovedInput = new TextInputBuilder()
        .setCustomId('loved')
        .setLabel('What did you love about Skope?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('What features or services did you find most useful?')
        .setRequired(true)
        .setMaxLength(1000);

      const improvementInput = new TextInputBuilder()
        .setCustomId('improvement')
        .setLabel('What can we improve?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Any features you want tweaked or added?')
        .setRequired(false)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(lovedInput),
        new ActionRowBuilder().addComponents(improvementInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // G. Bug Report Submit Button
    if (customId === 'bug_submit_btn') {
      const modal = new ModalBuilder()
        .setCustomId('bug_modal')
        .setTitle('🐛 Report a Bug');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Bug Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Short description of the bug')
        .setRequired(true)
        .setMaxLength(100);

      const reproduceInput = new TextInputBuilder()
        .setCustomId('reproduce')
        .setLabel('Steps to Reproduce')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('1. go to page X\n2. click Y\n3. bug happens')
        .setRequired(true)
        .setMaxLength(1000);

      const expectedActualInput = new TextInputBuilder()
        .setCustomId('expected_actual')
        .setLabel('Expected vs. Actual Behavior')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Expected it to do X, but it actually did Y')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(reproduceInput),
        new ActionRowBuilder().addComponents(expectedActualInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // H. Feature Request Submit Button
    if (customId === 'feature_submit_btn') {
      const modal = new ModalBuilder()
        .setCustomId('feature_modal')
        .setTitle('💡 Request a Feature');

      const titleInput = new TextInputBuilder()
        .setCustomId('title')
        .setLabel('Feature Title')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('What would you like to add?')
        .setRequired(true)
        .setMaxLength(100);

      const usefulnessInput = new TextInputBuilder()
        .setCustomId('usefulness')
        .setLabel('Why is this useful?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('How does this help Class 12 students or this server?')
        .setRequired(true)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(usefulnessInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // I. Bug Investigation Update (Staff Only)
    if (customId.startsWith('bug_investigate:')) {
      const bugId = customId.split(':')[1];
      const isStaff = member.roles.cache.has(config.roles.staff) || member.permissions.has(PermissionFlagsBits.ManageChannels);
      if (!isStaff) {
        return interaction.reply({ content: 'Only server staff can update bug report status.', ephemeral: true });
      }

      const bugDoc = await BugReport.findOne({ bugId });
      if (!bugDoc) {
        return interaction.reply({ content: 'Bug report not found in database.', ephemeral: true });
      }

      bugDoc.status = 'investigating';
      await bugDoc.save();

      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor('#f1c40f') // Yellow
        .setDescription(originalEmbed.description.replace(/⏳ Status: .+/g, '⚙️ Status: Under Investigation'))
        .setFields(
          { name: 'Status', value: '⚙️ Status: Under Investigation', inline: true },
          { name: 'Investigator', value: `<@${interaction.user.id}>`, inline: true }
        );

      await interaction.message.edit({ embeds: [updatedEmbed] });
      await interaction.reply({ content: 'Bug status updated to: **Under Investigation**.', ephemeral: true });
      return;
    }

    // J. Bug Resolve (Staff Only)
    if (customId.startsWith('bug_resolve:')) {
      const bugId = customId.split(':')[1];
      const isStaff = member.roles.cache.has(config.roles.staff) || member.permissions.has(PermissionFlagsBits.ManageChannels);
      if (!isStaff) {
        return interaction.reply({ content: 'Only server staff can update bug report status.', ephemeral: true });
      }

      const bugDoc = await BugReport.findOne({ bugId });
      if (!bugDoc) {
        return interaction.reply({ content: 'Bug report not found in database.', ephemeral: true });
      }

      bugDoc.status = 'resolved';
      await bugDoc.save();

      const originalEmbed = interaction.message.embeds[0];
      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setColor('#2ecc71') // Green
        .setDescription(originalEmbed.description.replace(/⏳ Status: .+/g, '✅ Status: Resolved').replace(/⚙️ Status: .+/g, '✅ Status: Resolved'))
        .setFields(
          { name: 'Status', value: '✅ Status: Resolved', inline: true },
          { name: 'Resolved By', value: `<@${interaction.user.id}>`, inline: true }
        );

      // Disable buttons
      const originalRow = interaction.message.components[0];
      const disabledRow = ActionRowBuilder.from(originalRow).toJSON();
      disabledRow.components.forEach(c => c.disabled = true);

      await interaction.message.edit({ embeds: [updatedEmbed], components: [disabledRow] });

      // DM reporter
      try {
        const reporter = await client.users.fetch(bugDoc.userId);
        if (reporter) {
          const dmEmbed = new EmbedBuilder()
            .setTitle('✅ Bug Report Resolved!')
            .setColor('#2ecc71')
            .setDescription(`Your bug report **"${bugDoc.title}"** in **${interaction.guild.name}** has been resolved by our development team.`)
            .setTimestamp();
          await reporter.send({ embeds: [dmEmbed] });
        }
      } catch (err) {
        logger.warn(`Could not DM bug resolution notice to reporter: ${err.message}`);
      }

      await interaction.reply({ content: 'Bug status updated to: **Resolved**.', ephemeral: true });
      return;
    }

    // K. Feature Request Upvote/Downvote
    if (customId.startsWith('feature_upvote:') || customId.startsWith('feature_downvote:')) {
      const type = customId.startsWith('feature_upvote:') ? 'up' : 'down';
      const requestId = customId.split(':')[1];
      const voterId = interaction.user.id;

      const featureDoc = await FeatureRequest.findOne({ requestId });
      if (!featureDoc) {
        return interaction.reply({ content: 'Feature request record not found in database.', ephemeral: true });
      }

      if (featureDoc.userId === voterId) {
        return interaction.reply({ content: '❌ You cannot vote on your own feature request!', ephemeral: true });
      }

      if (type === 'up') {
        if (featureDoc.upvotes.includes(voterId)) {
          featureDoc.upvotes = featureDoc.upvotes.filter(id => id !== voterId);
        } else {
          featureDoc.upvotes.push(voterId);
          featureDoc.downvotes = featureDoc.downvotes.filter(id => id !== voterId);
        }
      } else {
        if (featureDoc.downvotes.includes(voterId)) {
          featureDoc.downvotes = featureDoc.downvotes.filter(id => id !== voterId);
        } else {
          featureDoc.downvotes.push(voterId);
          featureDoc.upvotes = featureDoc.upvotes.filter(id => id !== voterId);
        }
      }

      await featureDoc.save();

      const originalEmbed = interaction.message.embeds[0];
      
      const badge = featureDoc.status === 'pending' ? '⏳ Status: Pending Review' :
                    featureDoc.status === 'approved' ? '✅ Status: Approved' :
                    featureDoc.status === 'declined' ? '❌ Status: Declined' :
                    '🤔 Status: Under Review';

      const updatedEmbed = EmbedBuilder.from(originalEmbed)
        .setFields(
          { name: 'Status', value: badge, inline: true },
          { name: 'Upvotes', value: `🟢 ${featureDoc.upvotes.length}`, inline: true },
          { name: 'Downvotes', value: `🔴 ${featureDoc.downvotes.length}`, inline: true }
        );

      const updatedButtonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feature_upvote:${requestId}`)
          .setLabel(`Upvote (${featureDoc.upvotes.length})`)
          .setStyle(ButtonStyle.Success)
          .setDisabled(featureDoc.status === 'approved' || featureDoc.status === 'declined'),
        new ButtonBuilder()
          .setCustomId(`feature_downvote:${requestId}`)
          .setLabel(`Downvote (${featureDoc.downvotes.length})`)
          .setStyle(ButtonStyle.Danger)
          .setDisabled(featureDoc.status === 'approved' || featureDoc.status === 'declined')
      );

      await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedButtonsRow] });
      await interaction.reply({ content: `Your vote has been updated. (Current Score: +${featureDoc.upvotes.length - featureDoc.downvotes.length})`, ephemeral: true });
      return;
    }
  }

  // 3. Handle Modal Submissions
  if (interaction.isModalSubmit()) {
    const customId = interaction.customId;

    // A. Announcement Modal Submit
    if (customId.startsWith('announce_modal:')) {
      const parts = customId.split(':');
      const channelId = parts[1];
      const mentionType = parts[2];

      const title = interaction.fields.getTextInputValue('title');
      const description = interaction.fields.getTextInputValue('description');
      const imageUrl = interaction.fields.getTextInputValue('image_url');

      const targetChannel = await client.channels.fetch(channelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) {
        return interaction.reply({ content: 'Could not post announcement. Channel not found or invalid.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const announcementEmbed = new EmbedBuilder()
        .setTitle(`📢 ${title}`)
        .setColor('#9b59b6') // Premium purple color
        .setDescription(description)
        .setFooter({ text: 'Skope Career Community Announcements' })
        .setTimestamp();

      if (imageUrl && imageUrl.startsWith('http')) {
        announcementEmbed.setImage(imageUrl);
      }

      const sendPayload = { embeds: [announcementEmbed] };

      // Apply mention strings
      if (mentionType === 'everyone') {
        sendPayload.content = '@everyone';
      } else if (mentionType === 'student' && config.roles.student && config.roles.student !== '123456789012345678') {
        sendPayload.content = `<@&${config.roles.student}>`;
      }

      await targetChannel.send(sendPayload);

      await interaction.editReply({ content: `Announcement posted successfully to <#${channelId}>.` });
      return;
    }

    // B. Suggestion Modal Submit
    if (customId === 'suggestion_modal') {
      const title = interaction.fields.getTextInputValue('title');
      const description = interaction.fields.getTextInputValue('description');
      const user = interaction.user;

      const suggestionsChannelId = config.channels.suggestions;
      const channel = await client.channels.fetch(suggestionsChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: 'Suggestions channel not found or misconfigured.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      // Embed details
      const sugEmbed = new EmbedBuilder()
        .setTitle(`📥 New Suggestion: ${title}`)
        .setColor('#f1c40f') // Pending Review yellow
        .setAuthor({ name: `Suggested by @${user.tag}`, iconURL: user.displayAvatarURL() })
        .setDescription(
          `**Description**:\n${description}\n\n` +
          `⏳ Status: Pending Review`
        )
        .addFields(
          { name: 'Status', value: '⏳ Status: Pending Review', inline: true },
          { name: 'Upvotes', value: '🟢 0', inline: true },
          { name: 'Downvotes', value: '🔴 0', inline: true }
        )
        .setTimestamp();

      // Send to suggestions channel first to get message ID
      const sentMessage = await channel.send({ embeds: [sugEmbed] });

      // Now create Upvote/Downvote buttons matching message ID
      const votingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`vote_upvote:${sentMessage.id}`)
          .setLabel('Upvote (0)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`vote_downvote:${sentMessage.id}`)
          .setLabel('Downvote (0)')
          .setStyle(ButtonStyle.Danger)
      );

      // Edit suggestion post with buttons
      await sentMessage.edit({ components: [votingRow] });

      // Auto-create thread for discussion
      const thread = await sentMessage.startThread({
        name: `💬 Discuss: ${title.substring(0, 50)}`,
        autoArchiveDuration: 1440, // 24 hours
        reason: 'Suggestion discussion thread'
      }).catch(err => {
        logger.warn(`Failed to create discussion thread for suggestion: ${err.message}`);
        return null;
      });

      // Save suggestion in MongoDB database
      const newSuggestion = new Suggestion({
        suggestionId: sentMessage.id,
        userId: user.id,
        username: user.tag,
        title,
        description,
        status: 'pending',
        upvotes: [],
        downvotes: [],
        threadId: thread ? thread.id : null
      });
      await newSuggestion.save();

      await interaction.editReply({ 
        content: `📥 Thank you! Your suggestion has been posted to <#${suggestionsChannelId}>. Thread: <#${thread ? thread.id : sentMessage.id}>` 
      });
      return;
    }

    // C. Student Feedback Modal Submit
    if (customId === 'feedback_modal') {
      const ratingStr = interaction.fields.getTextInputValue('rating');
      const loved = interaction.fields.getTextInputValue('loved');
      const improvement = interaction.fields.getTextInputValue('improvement') || 'None provided';
      const user = interaction.user;

      const rating = parseInt(ratingStr);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return interaction.reply({ content: '❌ Invalid Rating! Please enter a number between 1 and 5.', ephemeral: true });
      }

      const stars = '⭐'.repeat(rating);

      const feedbackChannelId = config.channels.feedback;
      const channel = await client.channels.fetch(feedbackChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: 'Feedback channel not found or misconfigured.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const feedbackEmbed = new EmbedBuilder()
        .setTitle('💬 Student Feedback Submission')
        .setColor('#2ecc71')
        .setAuthor({ name: `@${user.tag}`, iconURL: user.displayAvatarURL() })
        .addFields(
          { name: 'Rating', value: `${stars} (${rating}/5)` },
          { name: '💖 What they loved', value: loved },
          { name: '🛠️ Areas of improvement', value: improvement }
        )
        .setTimestamp();

      await channel.send({ embeds: [feedbackEmbed] });
      await interaction.editReply({ content: '🎉 Thank you! Your feedback has been submitted successfully.' });
      return;
    }

    // D. Bug Report Modal Submit
    if (customId === 'bug_modal') {
      const title = interaction.fields.getTextInputValue('title');
      const reproduce = interaction.fields.getTextInputValue('reproduce');
      const expectedActual = interaction.fields.getTextInputValue('expected_actual');
      const user = interaction.user;

      const bugsChannelId = config.channels.bugs;
      const channel = await client.channels.fetch(bugsChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: 'Bugs channel not found or misconfigured.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const bugEmbed = new EmbedBuilder()
        .setTitle(`🐛 Bug Report: ${title}`)
        .setColor('#e74c3c')
        .setAuthor({ name: `Reported by @${user.tag}`, iconURL: user.displayAvatarURL() })
        .setDescription(
          `**Status**: ⏳ Status: Open\n\n` +
          `**Steps to Reproduce**:\n${reproduce}\n\n` +
          `**Expected vs. Actual Behavior**:\n${expectedActual}`
        )
        .addFields(
          { name: 'Status', value: '⏳ Status: Open', inline: true }
        )
        .setTimestamp();

      const sentMsg = await channel.send({ embeds: [bugEmbed] });

      // Action row for moderators
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bug_investigate:${sentMsg.id}`)
          .setLabel('⚙️ Investigate')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`bug_resolve:${sentMsg.id}`)
          .setLabel('✅ Resolve')
          .setStyle(ButtonStyle.Success)
      );

      await sentMsg.edit({ components: [actionRow] });

      // Save to MongoDB
      const newBug = new BugReport({
        bugId: sentMsg.id,
        userId: user.id,
        username: user.tag,
        title,
        reproduceSteps: reproduce,
        expectedActual: expectedActual,
        status: 'open'
      });
      await newBug.save();

      await interaction.editReply({ content: '🐛 Thank you! Your bug report has been submitted to the developers.' });
      return;
    }

    // E. Feature Request Modal Submit
    if (customId === 'feature_modal') {
      const title = interaction.fields.getTextInputValue('title');
      const usefulness = interaction.fields.getTextInputValue('usefulness');
      const user = interaction.user;

      const featChannelId = config.channels.featureRequests;
      const channel = await client.channels.fetch(featChannelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: 'Feature requests channel not found or misconfigured.', ephemeral: true });
      }

      await interaction.deferReply({ ephemeral: true });

      const featEmbed = new EmbedBuilder()
        .setTitle(`💡 Feature Request: ${title}`)
        .setColor('#3498db')
        .setAuthor({ name: `Requested by @${user.tag}`, iconURL: user.displayAvatarURL() })
        .setDescription(
          `**Details**:\n${usefulness}\n\n` +
          `⏳ Status: Pending Review`
        )
        .addFields(
          { name: 'Status', value: '⏳ Status: Pending Review', inline: true },
          { name: 'Upvotes', value: '🟢 0', inline: true },
          { name: 'Downvotes', value: '🔴 0', inline: true }
        )
        .setTimestamp();

      const sentMsg = await channel.send({ embeds: [featEmbed] });

      const votingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`feature_upvote:${sentMsg.id}`)
          .setLabel('Upvote (0)')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`feature_downvote:${sentMsg.id}`)
          .setLabel('Downvote (0)')
          .setStyle(ButtonStyle.Danger)
      );

      await sentMsg.edit({ components: [votingRow] });

      // Start discussion thread
      const thread = await sentMsg.startThread({
        name: `💬 Discuss: ${title.substring(0, 50)}`,
        autoArchiveDuration: 1440,
        reason: 'Feature request discussion thread'
      }).catch(() => null);

      // Save to DB
      const newFeature = new FeatureRequest({
        requestId: sentMsg.id,
        userId: user.id,
        username: user.tag,
        title,
        usefulness,
        status: 'pending',
        upvotes: [],
        downvotes: [],
        threadId: thread ? thread.id : null
      });
      await newFeature.save();

      await interaction.editReply({ 
        content: `💡 Thank you! Your feature request has been posted to <#${featChannelId}>. Thread: <#${thread ? thread.id : sentMsg.id}>` 
      });
      return;
    }
  }
}
