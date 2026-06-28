import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a personal reminder')
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('In how many minutes should I remind you?')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080) // up to 1 week
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('What should I remind you about?')
        .setRequired(true)
        .setMaxLength(500)
    );

export async function execute(interaction) {
    const minutes = interaction.options.getInteger('minutes');
    const message = interaction.options.getString('message');
    
    const durationMs = minutes * 60 * 1000;
    const remindTime = Date.now() + durationMs;

    await interaction.reply({
      content: `✅ I will remind you about **"${message}"** in ${minutes} minute(s) (<t:${Math.floor(remindTime / 1000)}:R>).`,
      ephemeral: true
    });

    setTimeout(async () => {
      try {
        const embed = new EmbedBuilder()
          .setTitle('⏰ Reminder!')
          .setColor('#3498db')
          .setDescription(`You asked me to remind you about:\n\n**${message}**`)
          .setTimestamp();

        // Try to DM the user
        await interaction.user.send({ embeds: [embed] });
      } catch (err) {
        // If DMs are closed, fallback to channel ping
        await interaction.channel.send({ content: `<@${interaction.user.id}>, here is your reminder:\n**${message}**` }).catch(() => null);
      }
    }, durationMs);
  }

