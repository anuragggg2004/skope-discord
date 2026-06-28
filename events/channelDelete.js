import { AuditLogEvent } from 'discord.js';
import { trackAction, fetchExecutor } from '../services/antiNuke.js';

export const name = 'channelDelete';
export const once = false;

export async function execute(channel, client) {
  if (!channel.guild) return;

  const executorId = await fetchExecutor(channel.guild, AuditLogEvent.ChannelDelete);
  if (executorId) {
    await trackAction(client, channel.guild, executorId, 'CHANNEL_DELETE');
  }
}
