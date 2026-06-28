import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue } from '../services/musicManager.js';

export const data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the current music queue');

export async function execute(interaction, client) {
    if (interaction.user.id !== '1002811349472129055') {
        return interaction.reply({ content: '❌ You do not have permission to use the music bot.', ephemeral: true });
    }

    const queue = getQueue(interaction.guildId);
    
    if (!queue || queue.songs.length === 0) {
        return interaction.reply({ content: 'The queue is currently empty.', ephemeral: true });
    }

    const upcoming = queue.songs.slice(0, 10);
    const description = upcoming.map((song, index) => {
        return `${index === 0 ? '**[Now Playing]**' : `**${index}.**`} [${song.title}](${song.url}) - <@${song.requester}>`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle('🎶 Music Queue')
        .setColor('#3498db')
        .setDescription(description)
        .setFooter({ text: queue.songs.length > 10 ? `...and ${queue.songs.length - 10} more songs.` : 'End of queue.' });

    await interaction.reply({ embeds: [embed] });
}
