/**
 * Fragment Service — Cross-Platform Content Echo (Pillar 2)
 *
 * After an article is published, this service calls the AI to extract
 * platform-optimised content fragments:
 *   - LinkedIn: Professional insight post (200 words, first-person)
 *   - Twitter/X: Hook + 5-7 tweet thread
 *   - Reddit: Discussion-starter post (community-friendly, no hard sell)
 */
const OpenAI = require('openai');
const axios = require('axios');
const settingsService = require('./settingsService');
const env = require('../config/env');

/**
 * Generate cross-platform content fragments for a published article.
 * @param {Object} article - the full article record from the DB
 * @returns {Object} { linkedin, twitter, reddit } or null on failure
 */
async function generateFragments(article) {
  try {
    const config = await settingsService.getSetting('ai_config');
    const keys = await settingsService.getSetting('api_keys');
    const provider = config?.provider || env.AI_PROVIDER;

    console.log(`[fragments] Generating cross-platform fragments for article: "${article.title}"`);

    const prompt = buildFragmentPrompt(article);

    let rawText;
    if (provider === 'gemini') {
      const key = keys?.gemini || env.GEMINI_API_KEY;
      if (!key) throw new Error('Gemini API key missing');
      const model = config?.gemini_model || env.GEMINI_MODEL;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const resp = await axios.post(url, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 2000 },
      });
      rawText = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      const key = keys?.openai || env.OPENAI_API_KEY;
      if (!key) throw new Error('OpenAI API key missing');
      const openai = new OpenAI({ apiKey: key });
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use faster/cheaper model for fragments
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.75,
        max_tokens: 2000,
      });
      rawText = resp.choices[0].message.content;
    }

    const fragments = parseFragments(rawText);
    console.log(`[fragments] ✅ Fragments generated for: "${article.title}"`);
    return fragments;
  } catch (err) {
    console.error(`[fragments] Failed to generate fragments for "${article.title}":`, err.message);
    return null;
  }
}

/**
 * Build the prompt asking the AI to extract all three platform fragments
 */
function buildFragmentPrompt(article) {
  const excerpt = article.content.replace(/<[^>]*>/g, '').substring(0, 3000); // strip HTML, take 3k chars

  return `You are a senior content strategist. Based on the following SEO article, write three platform-specific content fragments.

ARTICLE TITLE: ${article.title}
ARTICLE URL: ${article.published_url || '[URL pending]'}
ARTICLE EXCERPT:
${excerpt}

Return ONLY a valid JSON object with this exact structure (no code blocks, no markdown):
{
  "linkedin": {
    "post": "A 180-220 word professional insight post written in first-person. Share a key takeaway from the article. Start with a hook, use short paragraphs, end with a question to drive comments. Mention the article link naturally.",
    "hashtags": ["3", "to", "5", "relevant", "hashtags"]
  },
  "twitter": {
    "hook": "The opening tweet (max 240 chars) — a bold, controversial or surprising statement from the article",
    "thread": [
      "Tweet 2 of the thread (max 240 chars each)",
      "Tweet 3",
      "Tweet 4",
      "Tweet 5 — the CTA with the article link"
    ]
  },
  "reddit": {
    "subreddit_suggestion": "The most relevant subreddit to post in (e.g. r/SEO)",
    "title": "An engaging Reddit post title (not clickbait, honest)",
    "body": "A 150-200 word community-friendly discussion starter. Share genuine insight, ask for community opinions. Do NOT sound promotional. Mention the article as 'I wrote a deep-dive on this' naturally."
  }
}`;
}

/**
 * Safely parse the AI fragment JSON response
 */
function parseFragments(rawText) {
  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found');
    return JSON.parse(match[0]);
  } catch (err) {
    console.warn('[fragments] JSON parse failed, returning raw:', err.message);
    return { raw: rawText };
  }
}

/**
 * Count total fragments generated across a set of articles
 * (used by the authority dashboard metrics)
 */
function countFragmentMetrics(articles) {
  const metrics = { total: 0, linkedin: 0, twitter: 0, reddit: 0, withCitations: 0 };
  for (const art of articles) {
    if (art.content_fragments) {
      metrics.total++;
      if (art.content_fragments.linkedin) metrics.linkedin++;
      if (art.content_fragments.twitter) metrics.twitter++;
      if (art.content_fragments.reddit) metrics.reddit++;
    }
    if (art.research_data?.organic?.length > 0) metrics.withCitations++;
  }
  return metrics;
}

module.exports = { generateFragments, countFragmentMetrics };
