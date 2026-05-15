/**
 * ============================================================
 *  AI SERVICE  — v2 (Apple-Grade Redesign)
 * ============================================================
 *  KEY REDESIGN DECISIONS vs v1:
 *
 *  1. PROMPT: Delegated entirely to promptEngine.js — zero
 *     string-building logic here.
 *  2. TOKENS: Uses 16k output ceiling where supported; falls
 *     back gracefully.  v1 was hardcoded to 4000 — impossible
 *     for 9k+ articles.
 *  3. PARSING: No more fragile regex JSON extraction. Metadata
 *     is generated in a SEPARATE, fully-controlled JSON call so
 *     the main article is clean HTML with no JSON pollution.
 *  4. OUTLINE: Outline sections are validated & clamped before
 *     iteration — no more silent fallback to a single section.
 *  5. MEDIA: Placeholders are replaced with a single non-
 *     overlapping sequential scan (fixed regex-exec race).
 *  6. ERRORS: Every AI call uses callAI() which already
 *     validates the provider & key before sending the request.
 *  7. AUTHOR / SITE: Site record fetched once and passed to
 *     promptEngine — author_profile JSONB used automatically.
 * ============================================================
 */

'use strict';

const OpenAI        = require('openai');
const axios         = require('axios');
const promptEngine  = require('./promptEngine');
const researchService   = require('./researchService');
const youtubeService    = require('./youtubeService');
const unsplashService   = require('./unsplashService');
const linkingService    = require('./linkingService');
const settingsService   = require('./settingsService');
const supabase          = require('../config/database');
const env               = require('../config/env');

// ─── AI CALLER ────────────────────────────────────────────────────────────────

/**
 * Single, unified AI caller.
 * Reads provider config from DB (settingsService) with env fallback.
 *
 * @param {string} userPrompt
 * @param {string} systemPrompt
 * @param {'text'|'json'} responseFormat
 * @param {Object}  opts     — provider, model overrides
 * @returns {Promise<string>}
 */
async function callAI(userPrompt, systemPrompt = 'You are an elite SEO content strategist.', responseFormat = 'text', opts = {}) {
  const [config, keys] = await Promise.all([
    settingsService.getSetting('ai_config').catch(() => ({})),
    settingsService.getSetting('api_keys').catch(() => ({})),
  ]);

  const provider = opts.provider || config?.provider || env.AI_PROVIDER || 'openai';

  if (provider === 'gemini') {
    return _callGemini(userPrompt, systemPrompt, responseFormat, opts, config, keys);
  }
  return _callOpenAI(userPrompt, systemPrompt, responseFormat, opts, config, keys);
}

async function _callOpenAI(userPrompt, systemPrompt, responseFormat, opts, config, keys) {
  const model  = opts.model  || config?.openai_model  || env.OPENAI_MODEL  || 'gpt-4o';
  const apiKey =               keys?.openai            || env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('[AI] OpenAI API key is missing. Add it in Settings → AI Engine.');

  const openai = new OpenAI({ apiKey });

  // OpenAI requires the word "json" somewhere in the prompt when using json_object
  let prompt = userPrompt;
  if (responseFormat === 'json' && !prompt.toLowerCase().includes('json')) {
    prompt += '\n\nIMPORTANT: Your entire response MUST be a valid JSON object.';
  }

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system',  content: systemPrompt },
      { role: 'user',    content: prompt },
    ],
    temperature:   opts.temperature ?? config?.temperature ?? 0.72,
    max_tokens:    opts.maxTokens || 16000,   // v1 was 4000 — too low for long articles
    response_format: responseFormat === 'json' ? { type: 'json_object' } : undefined,
  });

  return response.choices[0].message.content;
}

async function _callGemini(userPrompt, systemPrompt, responseFormat, opts, config, keys) {
  const model  = opts.model  || config?.gemini_model  || env.GEMINI_MODEL  || 'gemini-1.5-pro';
  const apiKey =               keys?.gemini            || env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('[AI] Gemini API key is missing. Add it in Settings → AI Engine.');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

  const res = await axios.post(url, {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature:      opts.temperature ?? config?.temperature ?? 0.72,
      maxOutputTokens:  8192,
      responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
    },
  }, { timeout: 120000 });

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('[AI] Gemini returned an empty response.');
  return text;
}

// ─── MEDIA REPLACEMENT ────────────────────────────────────────────────────────

/**
 * Replace all [TYPE_PLACEHOLDER: query] tags in the article content.
 * Uses slice-based replacement to avoid regex-exec re-index bugs.
 * @param {string} focusKeyword  — The main keyword; used as image alt text.
 */
async function enrichMedia(content, mediaEnabled, focusKeyword = '') {
  if (!mediaEnabled) {
    return content
      .replace(/\[IMAGE_PLACEHOLDER:[^\]]*\]/gi, '')
      .replace(/\[YOUTUBE_PLACEHOLDER:[^\]]*\]/gi, '')
      .replace(/\[MAP_PLACEHOLDER:[^\]]*\]/gi, '');
  }

  // 1. Images — alt text is ALWAYS the focus keyword for RankMath compliance
  content = await _replacePlaceholders(content, /\[IMAGE_PLACEHOLDER:\s*(.*?)\]/gi, async (query) => {
    try {
      const img = await unsplashService.searchImage(query);
      if (!img) return '';
      // focusKeyword takes priority; fall back to query only if keyword is empty
      const altText = focusKeyword || img.alt || query;
      return `\n<figure class="article-image-block" style="margin:2rem 0">\n  <img src="${img.url}" alt="${altText}" loading="lazy" style="width:100%;border-radius:8px;height:auto" />\n  <figcaption style="font-size:.8rem;text-align:center;color:#666;margin-top:.5rem">${img.credit}</figcaption>\n</figure>\n`;
    } catch { return ''; }
  });

  // 2. YouTube
  content = await _replacePlaceholders(content, /\[YOUTUBE_PLACEHOLDER:\s*(.*?)\]/gi, async (query) => {
    try {
      const video = await youtubeService.searchVideo(query);
      if (!video) return '';
      return `\n<div class="video-container" style="margin:2rem 0">\n  <iframe src="${video.embedUrl}" width="100%" height="400" frameborder="0" allowfullscreen title="${video.title}"></iframe>\n  <p class="video-caption" style="text-align:center;font-style:italic;color:#666;margin-top:.5rem">▶ ${video.title}</p>\n</div>\n`;
    } catch { return ''; }
  });

  // 3. Maps
  content = await _replacePlaceholders(content, /\[MAP_PLACEHOLDER:\s*(.*?)\]/gi, async (query) => {
    const q = encodeURIComponent(query);
    return `\n<div class="map-embed" style="margin:2rem 0">\n  <iframe width="100%" height="400" frameborder="0" scrolling="no" src="https://maps.google.com/maps?q=${q}&output=embed"></iframe>\n</div>\n`;
  });

  return content;
}

/**
 * Post-processing pass: scan ALL <img> tags in final HTML content and
 * ensure the alt attribute contains the focus keyword.
 * This fixes images the AI wrote directly (not via placeholders).
 *
 * Strategy: if the existing alt doesn\'t already include the keyword,
 * prepend "[keyword] - " in front of the existing alt text.
 */
function enforceKeywordAltText(content, focusKeyword) {
  if (!focusKeyword) return content;
  const kw = focusKeyword.toLowerCase();

  // Match <img ... alt="..." ...> in all forms
  return content.replace(/<img(\s[^>]*)>/gi, (match, attrs) => {
    const altMatch = attrs.match(/alt="([^"]*)"/i);
    if (!altMatch) {
      // No alt attribute at all — add one with the keyword
      return `<img${attrs} alt="${focusKeyword}">`;
    }
    const existingAlt = altMatch[1];
    if (existingAlt.toLowerCase().includes(kw)) {
      // Already contains keyword — leave it alone
      return match;
    }
    // Prepend keyword to existing alt so it includes the focus keyword
    const newAlt = `${focusKeyword} - ${existingAlt}`;
    return `<img${attrs.replace(/alt="[^"]*"/i, `alt="${newAlt}"`)}>`;
  });
}

/**
 * Keyword Density Booster
 * Calculates current keyword density from the article HTML.
 * If it's below 0.9%, injects the focus keyword at the opening of eligible
 * <p> tags (spaced apart by at least 2 paragraphs) until target is reached.
 *
 * RankMath target: ~1% density.
 * Safe ceiling:     1.4% (avoids over-optimisation penalty).
 */
function boostKeywordDensity(content, focusKeyword) {
  if (!focusKeyword) return content;

  const kw      = focusKeyword.toLowerCase();
  const kwWords = kw.split(/\s+/).length;

  // Strip HTML to count real words and keyword occurrences
  const plainText  = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const totalWords = plainText.split(/\s+/).length;

  // Count exact (case-insensitive) keyword occurrences
  const countOccurrences = (text) => {
    const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return (text.match(re) || []).length;
  };

  const currentCount   = countOccurrences(plainText);
  const currentDensity = (currentCount * kwWords) / totalWords;

  // Already at or above 0.9% — do nothing
  if (currentDensity >= 0.009) {
    console.log(`[density] ✅ Keyword density OK: ${(currentDensity * 100).toFixed(2)}% (${currentCount} occurrences)`);
    return content;
  }

  // How many more injections do we need to reach 1%?
  const targetCount = Math.ceil((0.01 * totalWords) / kwWords);
  const needed      = Math.min(targetCount - currentCount, 12); // safety cap

  console.log(`[density] ⚠️  Density ${(currentDensity * 100).toFixed(2)}% (${currentCount}/${targetCount} needed). Injecting ${needed} more.`);

  // Find all <p> tag positions and inject keyword into eligible ones
  // "Eligible" = paragraph doesn't already start within 2 paragraphs of a previous injection
  let injected   = 0;
  let lastInjIdx = -3; // allow injection from the 1st paragraph
  let pIdx       = 0;

  content = content.replace(/<p>((?!<\/p>).{30,})/g, (match, body, offset) => {
    if (injected >= needed) return match;
    pIdx++;

    // Skip if too close to previous injection or already has keyword
    if (pIdx - lastInjIdx < 3) return match;
    if (body.toLowerCase().includes(kw)) { lastInjIdx = pIdx; return match; }

    // Inject: "<p>FocusKeyword is an important topic. Original text..."
    // We do a natural prepend rather than raw keyword stuffing
    lastInjIdx = pIdx;
    injected++;
    return `<p>${focusKeyword} ${body}`;
  });

  console.log(`[density] ✅ Injected ${injected} keyword occurrences. New estimated density: ~${(((currentCount + injected) * kwWords / totalWords) * 100).toFixed(2)}%`);
  return content;
}

/**
 * Helper: collect all matches first, then replace sequentially (no regex re-index issue).
 */
async function _replacePlaceholders(content, regex, replacerFn) {
  const matches = [];
  let m;
  // Reset lastIndex before scan
  regex.lastIndex = 0;
  while ((m = regex.exec(content)) !== null) {
    matches.push({ full: m[0], query: m[1].trim() });
  }
  for (const { full, query } of matches) {
    const replacement = await replacerFn(query);
    // Replace only the FIRST occurrence to be safe
    content = content.replace(full, replacement);
  }
  return content;
}

// ─── INTERNAL LINK ENGINE ────────────────────────────────────────────────────

async function fetchInternalLinks(keyword, campaignId) {
  try {
    const { data: articles } = await supabase
      .from('articles')
      .select('id, title, published_url, keywords!inner(campaign_id)')
      .eq('keywords.campaign_id', campaignId)
      .eq('status', 'published')
      .not('published_url', 'is', null)
      .limit(5); // Just take the last 5 instead of asking AI to pick

    if (!articles || articles.length === 0) return [];

    // FEATURE DEACTIVATED: User requested to stop non-core AI requests.
    // Returning first few matches instead of AI-selected ones.
    return articles.map(a => ({ url: a.published_url, title: a.title }));
  } catch {
    return [];
  }
}

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────

/**
 * Generate a complete SEO article.
 *
 * @param {Object}   keyword       - Row from `keywords` table
 * @param {Object}   options       - Runtime overrides
 * @param {Function} onProgress    - (message: string) => void   (optional)
 * @returns {Promise<ArticleResult>}
 *
 * @typedef ArticleResult
 * @property {string} title
 * @property {string} slug
 * @property {string} meta_description
 * @property {string} content         - Final, enriched HTML
 * @property {number} word_count
 * @property {string|null} featured_image_url
 * @property {Object|null} research_data
 * @property {Object|null} schema
 */
async function generateArticle(keyword, options = {}, onProgress = null) {
  const emit = (msg) => {
    if (onProgress) onProgress(msg);
    console.log(`[AI Pipeline] ${msg}`);
  };

  // ── 1. Load data context ─────────────────────────────────────────────────
  emit('Loading campaign and site configuration...');

  const [globalArticleConf, { data: campaign }] = await Promise.all([
    settingsService.getSetting('article_config').catch(() => ({})),
    supabase.from('campaigns').select('*').eq('id', keyword.campaign_id).single(),
  ]);

  // Merge global article config with per-campaign overrides
  const articleConf = _deepMerge(globalArticleConf || {}, campaign?.article_config || {});

  // Fetch site for author_profile
  let site = null;
  if (campaign?.target_site_id) {
    const { data } = await supabase.from('sites').select('*').eq('id', campaign.target_site_id).single();
    site = data;
  }

  const mediaEnabled = options.media_enabled !== undefined
    ? options.media_enabled
    : (articleConf?.media_enabled !== false);

  // ── 2. Live Research ─────────────────────────────────────────────────────
  emit('Running live SERP research via Serper.dev...');
  const research      = await researchService.searchKeyword(keyword.main_keyword, 5, campaign?.language);
  const researchBlock = researchService.buildResearchBlock(research);

  // ── 3. Fetch Link Context ────────────────────────────────────────────────
  emit('Building internal & external link map...');

  const internalLinks = await fetchInternalLinks(keyword, keyword.campaign_id);
  const extLinkSource = options.external_links_list
    ? options.external_links_list.split(',').map(u => ({ url: u.trim(), title: 'Authority Reference' }))
    : linkingService.getExternalLinks(keyword.main_keyword);

  const maxExt            = articleConf?.linking?.max_external_links || 4;
  const internalLinksStr  = JSON.stringify(internalLinks);
  const externalLinksStr  = JSON.stringify(extLinkSource.slice(0, maxExt));

  // ── 4. Compile Master Prompt ─────────────────────────────────────────────
  const masterPrompt = promptEngine.compile(keyword, campaign, site, articleConf, options, researchBlock, internalLinksStr, externalLinksStr);

  // ── 5. Generate Outline ──────────────────────────────────────────────────
  emit('Generating structural blueprint (outline)...');

  const targetLength = options.target_length || options.targetLength || articleConf?.target_word_count || 3000;
  const numSections  = Math.max(4, Math.ceil(Number(targetLength) / 700));

  const outlinePrompt = `You are building the structural blueprint for a ${targetLength}-word SEO article.

Based on the MASTER STRATEGY below, generate a JSON outline with EXACTLY ${numSections} sections.

Rules:
- Return ONLY valid JSON: { "sections": [ { "title": "...", "description": "...", "target_word_count": 700 } ] }
- Each section title must be unique, semantic, and match an H2 heading.
- target_word_count per section should sum to approximately ${targetLength}.
- NO introduction or conclusion sections — those are handled separately.

MASTER STRATEGY:
${masterPrompt}`;

  let outline;
  try {
    const outlineRaw = await callAI(outlinePrompt, 'You are a senior content architect.', 'json');
    const parsed     = JSON.parse(outlineRaw);
    // Validate and clamp
    if (Array.isArray(parsed?.sections) && parsed.sections.length > 0) {
      outline = { sections: parsed.sections.slice(0, 16) }; // cap at 16 sections
    } else {
      throw new Error('Invalid outline format');
    }
  } catch (e) {
    console.warn('[AI Pipeline] Outline parse failed, using fallback:', e.message);
    outline = {
      sections: [
        { title: 'Overview',                    description: 'High-level overview of the topic.',  target_word_count: 600 },
        { title: 'Key Benefits & Features',     description: 'Deep dive into core benefits.',       target_word_count: 700 },
        { title: 'How It Works',                description: 'Step-by-step explanation.',           target_word_count: 700 },
        { title: 'Expert Tips & Best Practices',description: 'Actionable tips for readers.',        target_word_count: 700 },
        { title: 'Common Mistakes to Avoid',    description: 'Pitfalls and how to sidestep them.', target_word_count: 600 },
      ]
    };
  }

  // ── 6. Iterative Section Generation ─────────────────────────────────────
  const total       = outline.sections.length;
  const writtenTitles = [];
  let   fullContent = '';

  // Generate H1 intro first
  emit('Writing article introduction...');
  const introPrompt = `Write a powerful HTML introduction for this article.

Article Topic: "${keyword.main_keyword}"

Rules:
- Use an <h1> tag for the title. The <h1> MUST contain the exact phrase "${keyword.main_keyword}" near the start.
- Write 180-250 words for the body.
- THE VERY FIRST SENTENCE of the first <p> MUST include the exact phrase "${keyword.main_keyword}". This is mandatory for RankMath SEO compliance.
- CRITICAL: Dive straight into the core value. No fluffy preambles.
- CRITICAL: Output raw HTML only. Do NOT use markdown blocks like \`\`\`html.

STRATEGY CONTEXT:
${masterPrompt.substring(0, 1500)}`;

  const intro = await callAI(introPrompt, 'You are a senior SEO copywriter.', 'text', { maxTokens: 600 });
  fullContent += `\n${intro}\n`;

  for (const [i, section] of outline.sections.entries()) {
    emit(`Writing section ${i + 1}/${total}: "${section.title}"...`);

    const sectionPrompt = `You are writing Section ${i + 1} of ${total} for a long-form article on "${keyword.main_keyword}".

SECTION TITLE: "${section.title}"
GOAL: ${section.description}
TARGET LENGTH: ${section.target_word_count} words

Previously covered topics (DO NOT repeat): ${writtenTitles.join(', ') || 'None yet.'}

Rules:
- Use an <h2> tag for the section title. WHERE RELEVANT, include a variation of "${keyword.main_keyword}" inside the <h2>.
- Use <h3> subheadings for sub-topics. At least ONE <h3> should contain "${keyword.main_keyword}" or closely related phrasing.
- Use rich HTML: <ul>, <ol>, <strong>, <em>, <blockquote> where appropriate.
- KEYWORD DENSITY: Naturally mention "${keyword.main_keyword}" at least once every 100 words (target ~1% density).
- Naturally use these secondary keywords: ${Array.isArray(keyword.secondary_keywords) ? keyword.secondary_keywords.join(', ') : ''}
- If adding an image (figure/img), the alt text MUST contain "${keyword.main_keyword}".
- If a visual would help, add ONE [IMAGE_PLACEHOLDER: ${keyword.main_keyword} description] or [YOUTUBE_PLACEHOLDER: query] tag.
- Include 1-2 external authority links (<a href="..."> to real websites) relevant to this section to satisfy RankMath outbound link check.
- Internal links available (use 1-2 naturally): ${internalLinksStr}
- CRITICAL: Output RAW HTML ONLY. Do NOT use markdown code blocks like \`\`\`html.
- Write THE SECTION ONLY — no preamble, no commentary.

STRATEGY CONTEXT (Follow tone, E-E-A-T rules, and facts):
${masterPrompt.substring(0, 1500)}`;

    const sectionContent = await callAI(sectionPrompt, 'You are a senior SEO copywriter.', 'text', { maxTokens: 2500 });
    fullContent += `\n<section id="section-${i + 1}">\n${sectionContent}\n</section>\n`;
    writtenTitles.push(section.title);
  }

  // ── 7. FAQ & Conclusion ──────────────────────────────────────────────────
  const includeFaq        = options.include_faq        !== false;
  const includeConclusion = options.include_conclusion !== false;

  if (includeFaq || includeConclusion) {
    emit('Generating FAQ & Conclusion...');

    const closingParts = [];
    if (includeFaq)        closingParts.push('A COMPREHENSIVE FAQ section with 15 or more Q&As in HTML <details>/<summary> or <dl> format. Use FAQ Schema structure.');
    if (includeConclusion) closingParts.push('A CONCLUSION section with a "Key Takeaways" bullet list and a strong call-to-action.');

    const closingPrompt = `You are finalising a long-form article about "${keyword.main_keyword}".

Write ONLY these sections in clean HTML:
${closingParts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Base the content on these covered topics: ${writtenTitles.join(', ')}.
Do NOT rewrite existing content. 
CRITICAL: Output RAW HTML ONLY. Do NOT use markdown wrappers like \`\`\`html or duplicate any FAQ sections.
Write directly, no preamble.

STRATEGY CONTEXT (Follow CTA directives and tone):
${masterPrompt.substring(0, 1500)}`;

    const closing = await callAI(closingPrompt, 'You are a senior SEO editor.', 'text', { maxTokens: 3000 });
    fullContent += `\n<section id="conclusion-faq">\n${closing}\n</section>\n`;
  }

  // ── 8. Metadata Generation (SEPARATE, CONTROLLED JSON CALL) ─────────────
  emit('Generating SEO metadata...');

  const metaPrompt = `You are an elite SEO copywriter. Generate metadata for an article. Return ONLY valid JSON — no explanation, no markdown.

FOCUS KEYWORD (must appear verbatim in title AND meta_description): "${keyword.main_keyword}"

MANDATORY RULES — Every rule below is NON-NEGOTIABLE:
1. "title": 55-65 chars. MUST contain the exact phrase "${keyword.main_keyword}". MUST contain at least one number (e.g. "7 Best", "Top 10", "2026 Guide"). MUST contain one power word (Best, Ultimate, Proven, Complete, Essential, Expert, Powerful, etc.).
2. "slug": lowercase, hyphens only, max 60 chars. MUST include key words from "${keyword.main_keyword}".
3. "meta_description": 145-160 chars. MUST contain the exact phrase "${keyword.main_keyword}" verbatim. MUST end with a benefit or call-to-action.
4. "featured_image_query": a descriptive Unsplash search query related to the topic.

Content Preview (use for context only):
"${fullContent.substring(0, 600).replace(/\n/g, ' ')}"

Return ONLY this JSON:
{
  "title": "...",
  "slug": "...",
  "meta_description": "...",
  "featured_image_query": "..."
}`;

  let metadata = { title: keyword.main_keyword, slug: keyword.main_keyword.toLowerCase().replace(/[^\w]+/g, '-'), meta_description: '', featured_image_query: keyword.main_keyword };
  try {
    const metaRaw = await callAI(metaPrompt, 'You are an SEO metadata specialist. Always follow instructions exactly.', 'json', { maxTokens: 400 });
    const parsed  = JSON.parse(metaRaw);
    if (parsed?.title) metadata = { ...metadata, ...parsed };
  } catch (e) {
    console.warn('[AI Pipeline] Metadata parse failed, using fallback:', e.message);
  }

  // ── 8b. Deterministic metadata enforcer ─────────────────────────────────
  // If the AI still missed the number or the keyword in description, fix it here.
  const kw = keyword.main_keyword;

  // Rule 1: title MUST contain a number
  if (!/\d/.test(metadata.title)) {
    // Prepend a year as a power number — feels natural and is RankMath-compliant
    const year = new Date().getFullYear();
    metadata.title = `${year} ${metadata.title}`.substring(0, 65);
    console.log(`[meta] ⚠️  No number in title — injected year: "${metadata.title}"`);
  }

  // Rule 2: title MUST contain the focus keyword
  if (!metadata.title.toLowerCase().includes(kw.toLowerCase())) {
    metadata.title = `${kw}: ${metadata.title}`.substring(0, 65);
    console.log(`[meta] ⚠️  Keyword missing from title — prepended keyword.`);
  }

  // Rule 3: meta_description MUST contain the focus keyword verbatim
  if (metadata.meta_description && !metadata.meta_description.toLowerCase().includes(kw.toLowerCase())) {
    // Prepend "Learn about [keyword] — " to the existing description
    metadata.meta_description = `${kw} — ${metadata.meta_description}`.substring(0, 160);
    console.log(`[meta] ⚠️  Keyword missing from meta_description — prepended keyword.`);
  }

  // Rule 4: ensure slug always contains the keyword words
  const kwSlug = kw.toLowerCase().replace(/[^\w]+/g, '-').replace(/-+/g, '-');
  if (!metadata.slug.includes(kwSlug.split('-')[0])) {
    metadata.slug = kwSlug + '-' + metadata.slug.replace(kwSlug, '').replace(/^-+/, '');
    metadata.slug = metadata.slug.substring(0, 60);
    console.log(`[meta] ⚠️  Keyword missing from slug — prepended keyword slug.`);
  }


  // ── 9. Featured Image ────────────────────────────────────────────────────
  let featuredImageUrl = null;
  if (mediaEnabled) {
    emit('Fetching featured image...');
    try {
      const heroImg = await unsplashService.searchImage(metadata.featured_image_query || keyword.main_keyword);
      if (heroImg) featuredImageUrl = heroImg.url;
    } catch { /* non-fatal */ }
  }

  // ── 10. Media Enrichment (placeholders → real embeds) ───────────────────
  emit('Enriching content with media embeds...');
  let enrichedContent = await enrichMedia(fullContent, mediaEnabled, keyword.main_keyword);

  // ── 10b. Enforce focus keyword in ALL image alt attributes ───────────────
  // This is a deterministic post-process pass — catches images the AI wrote
  // directly in the HTML body (not via placeholders) and fixes their alt text.
  enrichedContent = enforceKeywordAltText(enrichedContent, keyword.main_keyword);

  // ── 10c. Keyword Density Booster ─────────────────────────────────────────
  // Calculate current density. If below 0.9%, inject the keyword into paragraph
  // openings until we reach ~1%. This avoids rewriting the entire article.
  enrichedContent = boostKeywordDensity(enrichedContent, keyword.main_keyword);

  // ── 11. Return final article ─────────────────────────────────────────────
  emit('✅ Article generation complete!');

  return {
    title:              metadata.title,
    slug:               metadata.slug,
    meta_description:   metadata.meta_description,
    content:            enrichedContent,
    word_count:         enrichedContent.split(/\s+/).length,
    featured_image_url: featuredImageUrl,
    research_data:      research,
    schema:             null, // schema service handles this separately
  };
}

// ─── DEEP MERGE UTILITY ───────────────────────────────────────────────────────

/**
 * Perform a deep merge of two objects.
 */
function deepMerge(target, source) {
  if (!source || typeof source !== 'object') return target;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * Legacy alias for internal support.
 */
const _deepMerge = deepMerge;

/**
 * Standard buildPrompt logic used across the system.
 */
function buildPrompt(keyword, campaign, site, articleConf, options = {}, researchBlock = '', internalLinksStr = '[]', externalLinksStr = '[]') {
  return promptEngine.compile(
    keyword,
    campaign,
    site,
    articleConf,
    options,
    researchBlock,
    internalLinksStr,
    externalLinksStr
  );
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = { 
  generateArticle, 
  callAI, 
  deepMerge, 
  buildPrompt 
};
