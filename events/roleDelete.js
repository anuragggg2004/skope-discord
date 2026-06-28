import { AuditLogEvent } from 'discord.js';
import { trackAction, fetchExecutor } from '../services/antiNuke.js';

export const name = 'roleDelete';
export const once = false;

export async function execute(role, client) {
  if (!role.guild) return;

  const executorId = await fetchExecutor(role.guild, AuditLogEvent.RoleDelete);
  if (executorId) {
    await trackAction(client, role.guild, executorId, 'ROLE_DELETE');
  }
}
