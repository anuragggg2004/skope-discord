import { AuditLogEvent } from 'discord.js';
import { trackAction, fetchExecutor } from '../services/antiNuke.js';

export const name = 'guildBanAdd';
export const once = false;

export async function execute(ban, client) {
  if (!ban.guild) return;

  const executorId = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
  if (executorId) {
    await trackAction(client, ban.guild, executorId, 'MEMBER_BAN');
  }
}
