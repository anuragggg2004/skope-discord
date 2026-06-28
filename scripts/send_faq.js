import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  const faqChannelId = '1520506687658659850';
  const faqChannel = await client.channels.fetch(faqChannelId).catch(() => null);

  if (!faqChannel) {
    console.error('FAQ channel not found');
    process.exit(1);
  }

  const embed = new EmbedBuilder()
    .setTitle('❓ Frequently Asked Questions')
    .setColor('#4a90e2')
    .setDescription(
      'Welcome to the Skope FAQ!\n\n' +
      'We get a lot of questions about how the AI works, our privacy policies, and our college recommendations. ' +
      'Please select a question from the dropdown menu below to instantly get your answer!'
    )
    .setImage('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80')
    .setFooter({ text: 'Select a question below 👇' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('faq_select')
      .setPlaceholder('Click here to choose a question...')
      .addOptions([
        { label: 'Is this real AI or pre-written?', value: 'q1', emoji: '🤖' },
        { label: 'Will it push me toward expensive colleges?', value: 'q2', emoji: '💰' },
        { label: 'What if I don\'t have my final marks yet?', value: 'q3', emoji: '📝' },
        { label: 'Does it only work for engineering?', value: 'q4', emoji: '🎓' },
        { label: 'How is this different from Google?', value: 'q5', emoji: '🔍' },
        { label: 'Can my parents read the report?', value: 'q6', emoji: '👨‍👩‍👧' },
        { label: 'Does Skope take commission from colleges?', value: 'q7', emoji: '🚫' },
        { label: 'Can I download my career roadmap?', value: 'q8', emoji: '📥' },
        { label: 'How do you verify placement data?', value: 'q9', emoji: '📊' }
      ])
  );

  try {
    // Delete previous messages to clean up the channel
    const fetched = await faqChannel.messages.fetch({ limit: 10 });
    await faqChannel.bulkDelete(fetched);

    await faqChannel.send({ embeds: [embed], components: [row] });
    console.log('Successfully sent interactive FAQ embed!');
  } catch (err) {
    console.error('Error sending embed:', err.message);
  }

  process.exit(0);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error("Login failed", err);
    process.exit(1);
});
