import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('pomodoro')
    .setDescription('Start a collaborative Pomodoro study timer')
    .addIntegerOption(option =>
      option.setName('work')
        .setDescription('Work duration in minutes (default 25)')
        .setMinValue(1)
        .setMaxValue(120)
    )
    .addIntegerOption(option =>
      option.setName('break')
        .setDescription('Break duration in minutes (default 5)')
        .setMinValue(1)
        .setMaxValue(30)
    );

export async function execute(interaction) {
    const workMinutes = interaction.options.getInteger('work') || 25;
    const breakMinutes = interaction.options.getInteger('break') || 5;

    // Track participants
    const participants = new Set([interaction.user.id]);
    let isWorking = true;
    let isPaused = false;
    let timerInterval = null;
    
    // Convert to milliseconds
    const workDurationMs = workMinutes * 60 * 1000;
    const breakDurationMs = breakMinutes * 60 * 1000;
    let timeRemaining = workDurationMs;
    let endTime = Date.now() + timeRemaining;

    const generateEmbed = () => {
      const state = isWorking ? '🧠 Work Time' : '☕ Break Time';
      const color = isWorking ? '#e74c3c' : '#2ecc71';
      
      const participantMentions = Array.from(participants).map(id => `<@${id}>`).join(' ');
      
      return new EmbedBuilder()
        .setTitle(`🍅 Pomodoro Timer: ${state}`)
        .setColor(color)
        .setDescription(`**Session started by:** <@${interaction.user.id}>\n**Participants:** ${participantMentions}`)
        .addFields(
          { name: 'Work Duration', value: `${workMinutes} min`, inline: true },
          { name: 'Break Duration', value: `${breakMinutes} min`, inline: true },
          { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:T> (<t:${Math.floor(endTime / 1000)}:R>)`, inline: false }
        )
        .setFooter({ text: 'Click Join to get pinged on state changes!' })
        .setTimestamp();
    };

    const getButtons = (disableJoin = false) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('pomodoro_join')
          .setLabel('Join Timer')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('✋')
          .setDisabled(disableJoin),
        new ButtonBuilder()
          .setCustomId('pomodoro_stop')
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🛑')
      );
    };

    await interaction.reply({ embeds: [generateEmbed()], components: [getButtons()] });
    const message = await interaction.fetchReply();

    // Setup button collector
    const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: workDurationMs + breakDurationMs + 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'pomodoro_join') {
        if (participants.has(i.user.id)) {
          await i.reply({ content: 'You are already in this Pomodoro session!', flags: ['Ephemeral'] });
        } else {
          participants.add(i.user.id);
          await i.update({ embeds: [generateEmbed()] });
          await i.followUp({ content: `<@${i.user.id}> joined the timer!`, flags: ['Ephemeral'] });
        }
      } else if (i.customId === 'pomodoro_stop') {
        if (i.user.id !== interaction.user.id) {
          await i.reply({ content: 'Only the creator can stop the timer.', flags: ['Ephemeral'] });
          return;
        }
        collector.stop('stopped_by_user');
        await i.update({ content: 'Timer stopped.', embeds: [], components: [] });
      }
    });

    // Simple timeout logic to shift state once
    const endSession = async () => {
      if (collector.ended) return;
      
      const participantMentions = Array.from(participants).map(id => `<@${id}>`).join(' ');
      
      if (isWorking) {
        // Shift to break
        isWorking = false;
        endTime = Date.now() + breakDurationMs;
        await message.edit({ embeds: [generateEmbed()], components: [getButtons(true)] });
        await interaction.channel.send(`⏰ **Time is up!** Take a ${breakMinutes} minute break!\n${participantMentions}`);
        
        setTimeout(async () => {
          if (collector.ended) return;
          await interaction.channel.send(`⏰ **Break is over!** Time to get back to work or start a new \`/pomodoro\` session.\n${participantMentions}`);
          collector.stop('finished');
        }, breakDurationMs);
      }
    };

    setTimeout(endSession, workDurationMs);

    collector.on('end', (collected, reason) => {
      if (reason === 'finished') {
        message.edit({ components: [] }).catch(() => null);
      }
    });
  }

