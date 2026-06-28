import { SlashCommandBuilder } from 'discord.js';
import { skipSong } from '../services/musicManager.js';

export const data = new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skips the currently playing song');

export async function execute(interaction, client) {
    if (interaction.user.id !== '1002811349472129055') {
        return interaction.reply({ content: '❌ You do not have permission to use the music bot.', ephemeral: true });
    }

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel) {
        return interaction.reply({ content: '❌ You must be in a voice channel to use this.', ephemeral: true });
    }

    const success = skipSong(interaction.guildId);
    
    if (success) {
        await interaction.reply('⏭️ Skipped the current song.');
    } else {
        await interaction.reply({ content: '❌ There is no song currently playing.', ephemeral: true });
    }
}
