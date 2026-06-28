import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('unlock')
  .setDescription('Unlocks messaging permissions for everyone in this channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction, client) {
  const channel = interaction.channel;

  try {
    // Reset permission override: remove/inherit SendMessages override
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: null
    }, { reason: `Channel unlocked by moderator @${interaction.user.tag}` });

    const embed = new EmbedBuilder()
      .setTitle('🔓 Channel Unlocked')
      .setColor('#10b981') // Green
      .setDescription(`This channel has been unlocked. Everyone can now send messages.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Unlock command error:', err);
    await interaction.reply({ content: `Failed to unlock channel: ${err.message}`, ephemeral: true });
  }
}
