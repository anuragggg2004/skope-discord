import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Sets the slowmode cooldown delay for this channel.')
  .addIntegerOption(opt => 
    opt.setName('seconds')
       .setDescription('Cooldown duration in seconds (0 to disable)')
       .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction, client) {
  const seconds = interaction.options.getInteger('seconds');

  if (seconds < 0 || seconds > 21600) { // Discord maximum slowmode is 6 hours (21600 seconds)
    return interaction.reply({ content: '⚠️ Please select a duration between 0 and 21600 seconds.', ephemeral: true });
  }

  try {
    await interaction.channel.setRateLimitPerUser(seconds, `Slowmode updated by moderator @${interaction.user.tag}`);

    const embed = new EmbedBuilder()
      .setTitle('⏳ Slowmode Cooldown Set')
      .setColor(seconds > 0 ? '#ffbe0b' : '#10b981')
      .setDescription(
        seconds > 0 
          ? `Slowmode has been set to **${seconds} seconds** in this channel.` 
          : `Slowmode cooldown has been **disabled** in this channel.`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Slowmode update error:', err);
    await interaction.reply({ content: `Failed to update slowmode: ${err.message}`, ephemeral: true });
  }
}
