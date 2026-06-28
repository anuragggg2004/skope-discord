import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { logger } from '../services/logger.js';
import { config } from '../config.js';

export const name = 'voiceStateUpdate';
export const once = false;

export async function execute(oldState, newState, client) {
  // If no create room channel is configured, do nothing
  if (!config.channels.createRoom) return;

  const user = newState.member.user;

  // 1. Check if user joined the "Create Room" channel
  if (newState.channelId === config.channels.createRoom) {
    try {
      const guild = newState.guild;
      const categoryId = config.categories.studyRooms || newState.channel?.parentId;

      // Create a new voice channel for the user
      const newChannel = await guild.channels.create({
        name: `${user.username}'s Study Room`,
        type: ChannelType.GuildVoice,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
          },
          {
            id: user.id,
            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers],
          },
        ],
      });

      // Move the user to the newly created channel
      await newState.setChannel(newChannel);
      logger.info(`Created dynamic study room for ${user.tag}`);
    } catch (err) {
      logger.error(`Error creating dynamic voice channel for ${user.tag}:`, err);
    }
  }

  // 2. Check if a user left a dynamic channel and it is now empty
  // We check oldState to see where they came from
  if (oldState.channelId && oldState.channelId !== config.channels.createRoom) {
    const channel = oldState.channel;
    
    // Check if the channel is in the Study Rooms category
    if (channel && channel.parentId === config.categories.studyRooms) {
      // If the channel is now empty, delete it
      if (channel.members.size === 0) {
        try {
          await channel.delete('Dynamic study room became empty');
          logger.info(`Deleted empty dynamic study room: ${channel.name}`);
        } catch (err) {
          logger.error(`Error deleting empty dynamic study room ${channel.name}:`, err);
        }
      }
    }
  }
}
