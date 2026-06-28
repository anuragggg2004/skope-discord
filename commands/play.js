import { SlashCommandBuilder } from 'discord.js';
import { addSong } from '../services/musicManager.js';

export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Plays a song from YouTube or Spotify')
    .addStringOption(option => 
        option.setName('query')
        .setDescription('The song name or URL')
        .setRequired(true)
    );

export async function execute(interaction, client) {
    if (interaction.user.id !== '1002811349472129055') {
        return interaction.reply({ content: '❌ You do not have permission to use the music bot.', ephemeral: true });
    }

    const query = interaction.options.getString('query');
    const voiceChannel = interaction.member?.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({ content: '❌ You must be in a voice channel to play music.', ephemeral: true });
    }

    await interaction.deferReply();

    const result = await addSong(interaction.guild, voiceChannel, interaction.channel, query, interaction.user.id);
    
    if (result.success) {
        await interaction.editReply(result.message);
    } else {
        await interaction.editReply(`❌ ${result.message}`);
    }
}
