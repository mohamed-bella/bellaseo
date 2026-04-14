/**
 * Research Service — Live SERP + Fact Intelligence
 *
 * Uses Serper.dev to perform a real-time Google search before AI generation.
 * Provides:
 *   - Top organic results (for citations)
 *   - People Also Ask (for FAQ schema)
 *   - Featured snippet (for fact-checking)
 *   - Knowledge Graph (for entity context)
 */
const axios = require('axios');
const settingsService = require('./settingsService');
const env = require('../config/env');

const LANG_MAP = {
  spanish: { gl: 'es', hl: 'es' },
  french: { gl: 'fr', hl: 'fr' },
  german: { gl: 'de', hl: 'de' },
  italian: { gl: 'it', hl: 'it' },
  portuguese: { gl: 'pt', hl: 'pt' },
  dutch: { gl: 'nl', hl: 'nl' },
  arabic: { gl: 'sa', hl: 'ar' },
  uk_english: { gl: 'uk', hl: 'en' },
  english: { gl: 'us', hl: 'en' }
};

/**
 * Perform a live Google search via Serper.dev.
 * @param {string} query — The search term (usually the main keyword)
 * @param {number} num — Number of organic results to return (default 5)
 * @param {string} lang — The language/region code (default 'english')
 * @param {Object} options — Additional Serper parameters (e.g. tbs for time filtering)
 * @returns {Object} structured research data
 */
async function searchKeyword(query, num = 5, lang = 'english', options = {}) {
  const keys = await settingsService.getSetting('api_keys').catch(() => ({}));
  let apiKey = keys?.serper || env.SERPER_API_KEY;
  if (apiKey) apiKey = apiKey.toString().trim();

  if (!apiKey) {
    console.warn('[research] No Serper API key configured — skipping live research.');
    return null;
  }

  try {
    console.log(`[research] Fetching SERP data for: "${query}" (tbs: ${options.tbs || 'none'})`);

    const region = LANG_MAP[lang] || { gl: 'us', hl: 'en' };
    const response = await axios.post(
      'https://google.serper.dev/search',
      {
        q: query,
        num,
        gl: region.gl,
        hl: region.hl,
        tbs: options.tbs || undefined,
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const data = response.data;

    // Extract structured data
    const organic = (data.organic || []).slice(0, num).map((r) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      date: r.date || null,
    }));

    const peopleAlsoAsk = (data.peopleAlsoAsk || []).slice(0, 5).map((q) => ({
      question: q.question,
      snippet: q.snippet || '',
      link: q.link || '',
    }));

    const featuredSnippet = data.answerBox
      ? {
          title: data.answerBox.title || '',
          answer: data.answerBox.answer || data.answerBox.snippet || '',
          link: data.answerBox.link || '',
        }
      : null;

    const knowledgeGraph = data.knowledgeGraph
      ? {
          title: data.knowledgeGraph.title,
          type: data.knowledgeGraph.type,
          description: data.knowledgeGraph.description,
        }
      : null;

    const result = {
      query,
      fetchedAt: new Date().toISOString(),
      organic,
      peopleAlsoAsk,
      featuredSnippet,
      knowledgeGraph,
      totalResults: data.searchInformation?.totalResults || null,
    };

    console.log(
      `[research] Found ${organic.length} sources, ${peopleAlsoAsk.length} PAA questions for: "${query}"`
    );

    return result;
  } catch (err) {
    console.error('[research] Serper search failed:', err.message);
    return null; // Non-fatal — article generation continues without research
  }
}

/**
 * Build a structured research context block for injection into the AI prompt.
 * @param {Object} research — result from searchKeyword()
 * @returns {string} formatted text block for prompt injection
 */
function buildResearchBlock(research) {
  if (!research) return '';

  const lines = [
    '--- LIVE RESEARCH CONTEXT (use these facts/sources to ground your article) ---',
  ];

  if (research.featuredSnippet) {
    lines.push(`\nFeatured Answer on Google:\n"${research.featuredSnippet.answer}"\nSource: ${research.featuredSnippet.link}`);
  }

  if (research.organic.length > 0) {
    lines.push('\nTop Current Sources (cite these naturally in your article):');
    research.organic.forEach((r, i) => {
      const dateStr = r.date ? ` (${r.date})` : '';
      lines.push(`${i + 1}. ${r.title}${dateStr}\n   ${r.snippet}\n   Source: ${r.link}`);
    });
  }

  if (research.peopleAlsoAsk.length > 0) {
    lines.push('\nRelated Questions People Ask (address at least 2 in the article):');
    research.peopleAlsoAsk.forEach((q) => {
      lines.push(`- ${q.question}`);
    });
  }

  lines.push(
    '\nINSTRUCTIONS: Weave the above facts and sources naturally into the article. Use phrases like "According to [Source]...", "A recent study shows...", "As of 2026...". Do NOT use sources that contradict each other.'
  );
  lines.push('--- END RESEARCH CONTEXT ---');

  return lines.join('\n');
}

/**
 * Fact-check an article against research data using a fast AI pass.
 * Returns { passed: bool, flags: string[] }
 */
async function factCheckArticle(articleContent, research, aiGenerateFn) {
  if (!research || !research.organic.length) return { passed: true, flags: [] };

  try {
    const snippets = research.organic.map((r) => r.snippet).join('\n');
    const prompt = `You are a strict fact-checker. Review the following article excerpt against the provided source snippets. 
List any factual claims in the article that CANNOT be verified or CONTRADICT the sources. 
Be brief. If no issues found, reply with exactly: "PASS"

SOURCE SNIPPETS:
${snippets}

ARTICLE EXCERPT (first 2000 chars):
${articleContent.substring(0, 2000)}

FACT-CHECK RESULT:`;

    const result = await aiGenerateFn(prompt);
    const isPassed = result?.trim().startsWith('PASS');
    const flags = isPassed ? [] : [result.trim()];
    console.log(`[research] Fact-check result: ${isPassed ? '✅ PASS' : '⚠️ FLAGS FOUND'}`);
    return { passed: isPassed, flags };
  } catch (err) {
    console.warn('[research] Fact-check pass failed (non-fatal):', err.message);
    return { passed: true, flags: [] };
  }
}

module.exports = { searchKeyword, buildResearchBlock, factCheckArticle };
