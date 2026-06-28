import { SlashCommandBuilder } from 'discord.js';
import { stopMusic } from '../services/musicManager.js';

export const data = new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stops playback and clears the queue');

export async function execute(interaction, client) {
    if (interaction.user.id !== '1002811349472129055') {
        return interaction.reply({ content: '❌ You do not have permission to use the music bot.', ephemeral: true });
    }

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
        return interaction.reply({ content: '❌ You must be in a voice channel to use this.', ephemeral: true });
    }

    const success = stopMusic(interaction.guildId);
    
    if (success) {
        await interaction.reply('🛑 Stopped music and cleared the queue.');
    } else {
        await interaction.reply({ content: '❌ There is no music currently playing.', ephemeral: true });
    }
}
