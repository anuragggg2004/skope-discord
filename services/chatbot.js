import { config } from '../config.js';
import { logger } from './logger.js';

export async function chatWithAI(message, client) {
    if (!config.gmiCloudApiKey) {
        return "I'm sorry, my AI brain is currently disconnected (Missing API Key).";
    }

    try {
        // Fetch last 6 messages for context
        const fetchedMessages = await message.channel.messages.fetch({ limit: 6 });
        // Discord returns messages from newest to oldest, so we reverse it
        const pastMessages = Array.from(fetchedMessages.values()).reverse();

        const messagesForAI = [
            {
                role: 'system',
                content: `You are Skope, a friendly, helpful, and highly intelligent AI assistant for an Indian student Discord server. 
You help students with their studies, career paths (JEE, NEET, CUET, CA, Arts), and general chat.
Be concise, conversational, and use emojis. Do not output raw JSON, just reply naturally to the user.
Do not mention that you are an AI model created by Alibaba or any other company.`
            }
        ];

        // Format chat history
        for (const msg of pastMessages) {
            // Skip empty messages (e.g. just embeds) or commands
            if (!msg.content || msg.content.startsWith(config.prefix)) continue;

            // If the message is from the bot itself, treat it as assistant
            if (msg.author.id === client.user.id) {
                messagesForAI.push({ role: 'assistant', content: msg.content });
            } else {
                // Otherwise it's a user
                messagesForAI.push({ role: 'user', content: `${msg.author.username}: ${msg.content}` });
            }
        }

        const url = `https://api.gmi-serving.com/v1/chat/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.gmiCloudApiKey}`
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen3.5-35B-A3B',
                messages: messagesForAI,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            logger.error(`Chatbot API Error: ${errText}`);
            return "I'm having a little trouble thinking right now. Please try again later!";
        }

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        logger.error(`Error in chatWithAI: ${error.message}`);
        return "Oops, something went wrong in my circuits!";
    }
}
