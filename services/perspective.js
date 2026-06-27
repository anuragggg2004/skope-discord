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

  // 3. Check Toxicity using Perspective API (if configured)
  if (config.perspectiveApiKey) {
    try {
      const url = `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${config.perspectiveApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: { text },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            SEVERE_TOXICITY: {},
            INSULT: {},
            THREAT: {}
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const toxicityScore = data.attributeScores.TOXICITY.summaryValue.value;
        const severeToxicityScore = data.attributeScores.SEVERE_TOXICITY.summaryValue.value;
        const insultScore = data.attributeScores.INSULT.summaryValue.value;
        const threatScore = data.attributeScores.THREAT.summaryValue.value;

        // If toxicity, severe toxicity, threat, or insult is above 0.70 threshold
        const isToxic = toxicityScore > 0.70 || severeToxicityScore > 0.60 || insultScore > 0.70 || threatScore > 0.60;
        
        if (isToxic) {
          let reason = 'High toxicity score';
          if (threatScore > 0.60) reason = 'Potential threat';
          else if (insultScore > 0.70) reason = 'Insult detected';
          
          return {
            isToxic: true,
            isSpam: false,
            isStress: false,
            reason: `${reason} (${Math.round(Math.max(toxicityScore, severeToxicityScore, insultScore, threatScore) * 100)}%)`,
            score: Math.max(toxicityScore, severeToxicityScore, insultScore, threatScore)
          };
        }
      } else {
        const errText = await response.text();
        logger.warn(`Perspective API request failed (${response.status}): ${errText}`);
      }
    } catch (err) {
      logger.error('Error invoking Perspective API, falling back to local list:', err);
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
