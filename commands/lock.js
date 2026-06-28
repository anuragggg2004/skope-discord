import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Locks messaging permissions for everyone in this channel.')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction, client) {
  const channel = interaction.channel;
  
  try {
    // Set permission override: deny SendMessages for @everyone
    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
      SendMessages: false
    }, { reason: `Channel locked by moderator @${interaction.user.tag}` });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Channel Locked')
      .setColor('#ff3333') // Red
      .setDescription(`This channel has been locked. Only staff can send messages.`)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (err) {
    console.error('Lock command error:', err);
    await interaction.reply({ content: `Failed to lock channel: ${err.message}`, ephemeral: true });
  }
}
