import { config } from '../config.js';
import { logger } from './logger.js';

// Local list of highly stressed / self-harm keywords
const STRESS_KEYWORDS = [
  'kill myself', 'end my life', 'suicide', 'self-harm', 'self harm', 
  'depressed', 'want to die', 'killing myself', 'hanging myself', 
  'cannot take this anymore', 'cant take this anymore', 'life is meaningless'
];

// Local academic spam words
const SPAM_KEYWORDS = [
  'buy notes', 'cheating', 'leak paper', 'paper leak', 'leak exam', 
  'coaching classes', 'join my channel', 'test prep seller', 'buy assignments', 
  'unauthorized notes', 'whatsapp group link', 'telegram link'
];

// Local list of common toxic terms/slurs (as fallback)
const TOXIC_KEYWORDS = [
  'bitch', 'asshole', 'idiot', 'retard', 'bastard', 'fuck off', 'kill yourself', 'kys'
];

/**
 * Screen message content for academic spam, toxicity, and severe stress.
 * @param {string} text - Message text to check.
 * @returns {Promise<{isToxic: boolean, isSpam: boolean, isStress: boolean, reason: string, score: number}>}
 */
export async function analyzeContent(text) {
  const cleanText = text.toLowerCase();
  
  // 1. Check for Academic Spam
  const isSpamLink = /(chat\.whatsapp\.com|t\.me|discord\.gg\/[a-zA-Z0-9]+)/i.test(text);
  let isSpamKeyword = false;
  let matchedSpamKeyword = '';
  
  for (const kw of SPAM_KEYWORDS) {
    if (cleanText.includes(kw)) {
      isSpamKeyword = true;
      matchedSpamKeyword = kw;
      break;
    }
  }
  
  if (isSpamLink || isSpamKeyword) {
    return {
      isToxic: false,
      isSpam: true,
      isStress: false,
      reason: isSpamLink ? 'Unauthorized link (WhatsApp/Telegram/Discord invite)' : `Academic spam keyword: "${matchedSpamKeyword}"`,
      score: 1.0
    };
  }

  // 2. Check for Severe Stress / Mental Health crisis (Local keyword check always runs)
  let isStress = false;
  let matchedStressKeyword = '';
  for (const kw of STRESS_KEYWORDS) {
    if (cleanText.includes(kw)) {
      isStress = true;
      matchedStressKeyword = kw;
      break;
    }
  }
  
  if (isStress) {
    return {
      isToxic: false,
      isSpam: false,
      isStress: true,
      reason: `Stress/Self-Harm keyword detected: "${matchedStressKeyword}"`,
      score: 1.0
    };
  }

  // 3. Check Toxicity/Spam/Stress using GMI Cloud AI API (if configured)
  if (config.gmiCloudApiKey) {
    try {
      const url = `https://api.gmi-serving.com/v1/chat/completions`;
      const prompt = `You are a Discord moderation bot for an educational server.
Analyze the following message and output ONLY a valid JSON object.
Classify the message into one of these categories:
- STRESS: The user is expressing severe mental distress, self-harm, or suicidal thoughts.
- SPAM: The user is posting academic spam (selling notes, unauthorized links, cheating, paper leaks).
- TOXIC: The user is severely insulting others, using slurs, or making threats.
- SAFE: The message does not violate any rules.

Message: "${text}"

Output JSON format exactly:
{"category": "SAFE|TOXIC|SPAM|STRESS", "reason": "brief explanation", "score": 0.9}
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.gmiCloudApiKey}`
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen3.5-35B-A3B',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        try {
          const result = JSON.parse(content);
          const cat = result.category || 'SAFE';
          const score = result.score || 0.8;
          const reason = result.reason || 'AI Flagged';
          
          if (cat === 'STRESS') {
            return { isToxic: false, isSpam: false, isStress: true, reason: `AI: ${reason}`, score };
          } else if (cat === 'SPAM') {
            return { isToxic: false, isSpam: true, isStress: false, reason: `AI: ${reason}`, score };
          } else if (cat === 'TOXIC') {
            return { isToxic: true, isSpam: false, isStress: false, reason: `AI: ${reason}`, score };
          } else {
            return { isToxic: false, isSpam: false, isStress: false, reason: '', score: 0 };
          }
        } catch (parseErr) {
          logger.warn(`Failed to parse AI response: ${content}`);
        }
      } else {
        const errText = await response.text();
        logger.warn(`GMI Cloud API request failed (${response.status}): ${errText}`);
      }
    } catch (err) {
      logger.error('Error invoking GMI Cloud API, falling back to local list:', err);
    }
  }

  // 4. Fallback/Local Toxicity list check
  let isToxicLocal = false;
  let matchedToxicKeyword = '';
  for (const kw of TOXIC_KEYWORDS) {
    if (cleanText.includes(kw)) {
      isToxicLocal = true;
      matchedToxicKeyword = kw;
      break;
    }
  }

  if (isToxicLocal) {
    return {
      isToxic: true,
      isSpam: false,
      isStress: false,
      reason: `Local safety filter violation: "${matchedToxicKeyword}"`,
      score: 0.85
    };
  }

  // Safe message
  return {
    isToxic: false,
    isSpam: false,
    isStress: false,
    reason: '',
    score: 0.0
  };
}
