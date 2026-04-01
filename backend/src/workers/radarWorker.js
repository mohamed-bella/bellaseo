const supabase = require('../config/database');
const env = require('../config/env');
const whatsappService = require('../services/whatsappService');
const researchService = require('../services/researchService');
const settingsService = require('../services/settingsService');
const OpenAI = require('openai');
const axios = require('axios');

/**
 * AI Lead Evaluation
 * Analyzes the scraped context to decide if this is actually a person asking 
 * for tour recommendations/services, avoiding generic news or duplicate noise.
 */
async function evaluateLead(title, snippet) {
  const config = await settingsService.getSetting('ai_config').catch(() => null);
  const keys = await settingsService.getSetting('api_keys').catch(() => null);
  const provider = config?.provider || env.AI_PROVIDER;

  const prompt = `You are a strict lead generation evaluator for a travel agency.
Evaluate the following post. DOES the user show high intent to book a tour, get recommendations for an itinerary, or buy travel services?
If YES, reply with a number from 1 to 10 rating the intent, followed by a brief reason. 
If NO, reply strictly with exactly: "SKIP".

POST TITLE: "${title}"
POST SNIPPET: "${snippet}"

EVALUATION:`;

  try {
    if (provider === 'gemini') {
      const key = keys?.gemini || env.GEMINI_API_KEY;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
      const resp = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
      return resp.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'SKIP';
    } else {
      const key = keys?.openai || env.OPENAI_API_KEY;
      const openai = new OpenAI({ apiKey: key });
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      });
      return resp.choices[0].message.content;
    }
  } catch (err) {
    console.error('[Radar] AI eval failed:', err.message);
    return 'SKIP';
  }
}

/**
 * Core Radar Cycle
 * Queries Serper for listening triggers across platforms and evaluates the leads.
 */
async function runRadarCycle() {
  console.log('[Radar] Starting 24/7 opportunity scan...');
  try {
    const { data: rules, error: rulesErr } = await supabase.from('radar_rules')
      .select('*')
      .eq('is_active', true);
    
    if (rulesErr) throw rulesErr;
    if (!rules || rules.length === 0) {
      console.log('[Radar] No active rules found. Set up radar rules first.');
      return;
    }

    for (const rule of rules) {
      const platforms = rule.platforms || ['reddit.com', 'quora.com'];
      
      for (const platform of platforms) {
        const query = `site:${platform} "${rule.keywords}"`;
        const research = await researchService.searchKeyword(query, 10);
        if (!research || !research.organic) continue;

        for (const res of research.organic) {
          // Check uniqueness
          const { data: existing } = await supabase.from('opportunities')
            .select('id').eq('source_url', res.link).single();
          
          if (existing) continue; // Seen this already

          const evaluation = await evaluateLead(res.title, res.snippet);
          
          if (evaluation.trim().toUpperCase().startsWith('SKIP')) {
            // Ignored
            await supabase.from('opportunities').insert({
              rule_id: rule.id,
              platform,
              title: res.title,
              snippet: res.snippet,
              source_url: res.link,
              status: 'ignored'
            });
            continue;
          }

          const intentScoreMatch = evaluation.match(/^(\d+)/);
          const intentScore = intentScoreMatch ? parseInt(intentScoreMatch[1], 10) : 5;

          console.log(`[Radar] 🚨 High-intent lead found! (${intentScore}/10) - ${res.title}`);
          const lead = {
            rule_id: rule.id,
            platform,
            title: res.title,
            snippet: res.snippet,
            source_url: res.link,
            intent_score: intentScore,
            status: 'notified',
            notified_at: new Date().toISOString()
          };
          
          await supabase.from('opportunities').insert(lead);
          await whatsappService.sendLeadAlert(lead);
        }
      }
    }
    console.log('[Radar] Scan cycle complete.');
  } catch (err) {
    console.error('[Radar] Scan cycle error:', err.message);
  }
}

module.exports = { runRadarCycle };
