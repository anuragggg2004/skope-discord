import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('purge')
  .setDescription('Bulk deletes a specified number of messages from this channel.')
  .addIntegerOption(opt => 
    opt.setName('amount')
       .setDescription('Number of messages to delete (1-100)')
       .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction, client) {
  let amount = interaction.options.getInteger('amount');
  
  // Validate range
  if (amount < 1 || amount > 100) {
    return interaction.reply({ content: '⚠️ Please select an amount between 1 and 100.', ephemeral: true });
  }

  try {
    const deleted = await interaction.channel.bulkDelete(amount, true);
    
    await interaction.reply({ 
      content: `🧹 Successfully deleted **${deleted.size}** messages.`, 
      ephemeral: true 
    }).catch(async () => {
      // For message-based prefix commands, reply might not be ephemeral or defer-based
      const reply = await interaction.channel.send(`🧹 Successfully deleted **${deleted.size}** messages.`);
      setTimeout(() => reply.delete().catch(() => null), 4000);
    });
  } catch (err) {
    console.error('Purge error:', err);
    await interaction.reply({ 
      content: `Failed to delete messages: ${err.message}. Messages older than 14 days cannot be bulk deleted.`, 
      ephemeral: true 
    });
  }
}
