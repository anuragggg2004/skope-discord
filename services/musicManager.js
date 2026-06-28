import { 
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior
} from '@discordjs/voice';
import playdl from 'play-dl';
import { logger } from './logger.js';
import { EmbedBuilder } from 'discord.js';

// Map to store guild-specific queues
// Key: Guild ID, Value: Queue Object
const queues = new Map();

/**
 * Gets or creates a queue for a specific guild
 */
export function getQueue(guildId) {
    if (!queues.has(guildId)) {
        queues.set(guildId, {
            songs: [],
            connection: null,
            player: createAudioPlayer({
                behaviors: {
                    noSubscriber: NoSubscriberBehavior.Pause,
                },
            }),
            textChannel: null,
            playing: false
        });

        const queue = queues.get(guildId);

        // Handle Audio Player State Changes
        queue.player.on(AudioPlayerStatus.Idle, () => {
            queue.songs.shift(); // Remove finished song
            if (queue.songs.length > 0) {
                playNext(guildId);
            } else {
                queue.playing = false;
                setTimeout(() => {
                    const currentQueue = queues.get(guildId);
                    if (currentQueue && currentQueue.songs.length === 0 && currentQueue.connection) {
                        currentQueue.connection.destroy();
                        queues.delete(guildId);
                    }
                }, 60000); // Wait 60s before disconnecting if empty
            }
        });

        queue.player.on('error', error => {
            logger.error(`Error in audio player: ${error.message}`);
            queue.songs.shift();
            if (queue.songs.length > 0) playNext(guildId);
        });
    }
    return queues.get(guildId);
}

/**
 * Plays the next song in the queue
 */
async function playNext(guildId) {
    const queue = queues.get(guildId);
    if (!queue || queue.songs.length === 0) return;

    const song = queue.songs[0];
    
    try {
        // Remove discordPlayerCompatibility flag as it breaks raw @discordjs/voice audio
        const stream = await playdl.stream(song.url);
        const resource = createAudioResource(stream.stream, {
            inputType: stream.type
        });

        queue.player.play(resource);
        queue.playing = true;

        if (queue.textChannel) {
            const embed = new EmbedBuilder()
                .setTitle('🎶 Now Playing')
                .setDescription(`[${song.title}](${song.url})`)
                .addFields({ name: 'Requested by', value: `<@${song.requester}>`, inline: true })
                .setThumbnail(song.thumbnail)
                .setColor('#2ecc71');
            
            queue.textChannel.send({ embeds: [embed] }).catch(() => null);
        }
    } catch (error) {
        logger.error(`Error playing song ${song.url}: ${error.message}`);
        queue.songs.shift();
        if (queue.songs.length > 0) {
            playNext(guildId);
        } else {
            queue.playing = false;
        }
    }
}

/**
 * Adds a song to the queue and starts playing if idle
 */
export async function addSong(guild, voiceChannel, textChannel, query, requesterId) {
    const queue = getQueue(guild.id);
    queue.textChannel = textChannel;

    try {
        // Search for the song
        let songInfo;
        if (query.startsWith('http')) {
            const info = await playdl.video_info(query);
            songInfo = info.video_details;
        } else {
            const searchResults = await playdl.search(query, { limit: 1 });
            if (searchResults.length === 0) {
                return { success: false, message: 'Could not find any results for that query.' };
            }
            songInfo = searchResults[0];
        }

        const song = {
            title: songInfo.title,
            url: songInfo.url,
            thumbnail: songInfo.thumbnails ? songInfo.thumbnails[0].url : null,
            requester: requesterId
        };

        queue.songs.push(song);

        // Connect to voice if not already connected
        if (!queue.connection || queue.connection.state.status === VoiceConnectionStatus.Disconnected) {
            queue.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: guild.id,
                adapterCreator: guild.voiceAdapterCreator,
            });
            queue.connection.subscribe(queue.player);

            // Handle connection disconnects
            queue.connection.on(VoiceConnectionStatus.Disconnected, () => {
                queue.connection.destroy();
                queues.delete(guild.id);
            });
        }

        if (!queue.playing) {
            playNext(guild.id);
            return { success: true, message: `Starting playback with **${song.title}**`, song };
        } else {
            return { success: true, message: `Added to queue: **${song.title}**`, song };
        }
    } catch (error) {
        logger.error('Error adding song:', error);
        return { success: false, message: `An error occurred: ${error.message}` };
    }
}

/**
 * Skips the current song
 */
export function skipSong(guildId) {
    const queue = queues.get(guildId);
    if (!queue || !queue.playing) return false;
    queue.player.stop(); // Emits Idle event, which triggers playNext
    return true;
}

/**
 * Stops playback and clears the queue
 */
export function stopMusic(guildId) {
    const queue = queues.get(guildId);
    if (!queue) return false;
    queue.songs = [];
    queue.player.stop();
    if (queue.connection) {
        queue.connection.destroy();
    }
    queues.delete(guildId);
    return true;
}
