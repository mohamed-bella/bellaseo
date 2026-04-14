/**
 * ============================================================
 *  PROMPT ENGINE  — v2 (Apple-Grade Redesign)
 * ============================================================
 *  - Ships a smart DEFAULT template so the system NEVER crashes
 *    when no custom template is set.
 *  - Interpolates a rich set of {{variables}} — keyword data,
 *    campaign context, per-site author profile, and directives.
 *  - All interpolation happens in ONE place so every path
 *    (worker, content-lab, regenerate) is identical.
 * ============================================================
 */

'use strict';

// ─── DEFAULT MASTER TEMPLATE ──────────────────────────────────────────────────
// This is the core engine instruction. It uses the user's specific rules:
// "write clear, useful content for any niche based on the given topic and keywords."

const DEFAULT_TEMPLATE = [
  'Your job is to write clear, useful content for the niche "{{niche}}" based on the topic "{{keyword}}" and keywords "{{secondaryKeywords}}".',
  '',
  '# CONTENT RULES',
  '- Use simple, clear English (Language: {{language}}).',
  '- Keep paragraphs short (2–4 lines).',
  '- Avoid hype, fake claims, or marketing exaggeration.',
  '- Focus on real user intent (Intent: {{intent}}) and problems.',
  '- Write like a human, not a robot.',
  '',
  '# STRUCTURE RULES',
  'Always organize content like this:',
  '1. Introduction',
  '2. Problem / context',
  '3. Solution or explanation',
  '4. Key points or features (use list if needed)',
  '5. {{faqDirective}}',
  '6. {{conclusionDirective}}',
  '',
  '# SEO RULES (RANKMATH COMPLIANCE — CRITICAL)',
  '- KEYWORD IN TITLE: The EXACT phrase "{{keyword}}" MUST appear in the <h1> title, preferably near the start.',
  '- KEYWORD IN FIRST PARAGRAPH: The EXACT phrase "{{keyword}}" MUST appear within the FIRST 100 WORDS of the body content.',
  '- KEYWORD IN H2/H3: At least 2 subheadings (<h2> or <h3>) must contain the exact phrase "{{keyword}}" or a very close variation.',
  '- KEYWORD DENSITY: Use the exact phrase "{{keyword}}" at least once per 100 words. Target overall density of ~1%. Do NOT overstuff.',
  '- USE SECONDARY KEYWORDS: Weave {{secondaryKeywords}} naturally into H2s, H3s, and body text.',
  '- IMAGE ALT TEXT: Every <img> tag MUST have an alt attribute containing "{{keyword}}".',
  '- OUTBOUND LINKS: Include 2-3 external authority links using <a href="..."> pointing to real, relevant websites.',
  '- INTERNAL LINKS (if any): {{internalLinks}}',
  '- Do NOT repeat keywords unnaturally or in back-to-back sentences.',
  '- Write for humans first, SEO second.',
  '',
  '# HTML OUTPUT RULES (STRICT)',
  '- Output ONLY pure HTML.',
  '- Start with <h1> and end with </html>.',
  '- DO NOT use markdown (no ```html).',
  '- DO NOT include any explanations.',
  '- Use ONLY these tags: <h1> <h2> <h3> <p> <ul> <li> <ol> <table> <tr> <td> <th> <a> <img> <figure> <figcaption> <strong> <em>',
  '',
  '# DESIGN CONSTRAINTS',
  '- No CSS, no inline styles, no classes or IDs.',
  '- Keep structure clean and readable.',
  '',
  '# OPTIONAL ELEMENTS',
  '- If pricing is mentioned → use <table>',
  '- If listing features → use <ul><li>',
  '- If FAQ → use <h3> for each question and <p> for the answer',
  '',
  '# BEHAVIOR RULES',
  '- Do not invent fake data.',
  '- Do not use placeholders like "lorem ipsum".',
  '- Do not repeat the same sentences.',
  '- Do not go off-topic.',
  '- Target word count: {{targetLength}}.',
  '',
  '# ADDITIONAL CONTEXT',
  '- Author Profile: {{authorName}} - {{authorBio}}',
  '- Target Audience: {{targetAudience}}',
  '- Site Name: {{siteName}}',
  '- Tone & Voice: {{tone}}',
  '- External Links (if any): {{externalLinks}}',
  '- Live Research Data: {{researchBlock}}',
  '- Special Campaign Instructions: {{campaignDirectives}}',
].join('\n');


// ─── CONTEXT BUILDER ─────────────────────────────────────────────────────────

/**
 * Build the full interpolation context from all data sources.
 *
 * @param {Object} keyword        - Row from `keywords` table
 * @param {Object} campaign       - Row from `campaigns` table (may be null)
 * @param {Object} site           - Row from `sites` table (may be null)
 * @param {Object} articleConf    - Merged article_config JSONB
 * @param {Object} options        - Runtime options from caller
 * @param {string} researchBlock  - Pre-built research string
 * @param {string} internalLinksStr  - JSON array string
 * @param {string} externalLinksStr  - JSON array string
 * @returns {Object}
 */
function buildContext(keyword, campaign, site, articleConf, options, researchBlock, internalLinksStr, externalLinksStr) {
  articleConf      = articleConf      || {};
  options          = options          || {};
  researchBlock    = researchBlock    || '';
  internalLinksStr = internalLinksStr || '[]';
  externalLinksStr = externalLinksStr || '[]';

  const secondary = Array.isArray(keyword.secondary_keywords)
    ? keyword.secondary_keywords.join(', ')
    : (keyword.secondary_keywords || '');

  // Author Priority: options > site.author_profile > articleConf.author > defaults
  const siteAuthor   = (site && site.author_profile)      ? site.author_profile      : {};
  const configAuthor = articleConf.author                  ? articleConf.author       : {};

  const authorName     = options.authorName     || siteAuthor.name     || configAuthor.name     || 'Editorial Team';
  const authorBio      = options.authorBio      || siteAuthor.bio      || configAuthor.bio      ||
    ('An expert writer specialising in ' + ((campaign && campaign.niche) || 'this industry') + '.');
  const targetAudience = options.targetAudience || siteAuthor.audience || configAuthor.audience ||
    ('General readers interested in ' + ((campaign && campaign.niche) || 'the topic'));

  const siteName = (site && site.name) || (campaign && campaign.target_site_name) || 'Our Publication';

  const includeFaq        = options.include_faq        !== false;
  const includeConclusion = options.include_conclusion !== false;
  const targetLength      = options.target_length || options.targetLength || articleConf.target_word_count || 1500;
  const tone              = options.tone     || (campaign && campaign.tone)     || articleConf.tone     || 'professional and helpful';
  const language          = options.language || (campaign && campaign.language) || 'English';

  const faqDirective        = includeFaq        ? 'FAQ (Provide a relevant FAQ section. MUST use <h3> for each Question and <p> for the Answer)' : 'Omit FAQ section.';
  const conclusionDirective = includeConclusion ? 'Conclusion/CTA (Provide a simple conclusion or call to action)' : 'Omit Conclusion section.';

  const rawDirectives      = (campaign && campaign.prompt_template) || articleConf.campaign_directives || '';
  const campaignDirectives = rawDirectives
    ? ('The following are extra instructions from the campaign manager. Follow them strictly:\n\n' + rawDirectives)
    : '(No additional campaign directives.)';

  return {
    keyword:             keyword.main_keyword || 'Topic',
    secondaryKeywords:   secondary,
    intent:              keyword.intent        || 'informational',
    niche:               (campaign && campaign.niche) || 'General',
    language,
    tone,
    targetLength:        String(targetLength),
    authorName,
    authorBio,
    targetAudience,
    siteName,
    faqDirective,
    conclusionDirective,
    campaignDirectives,
    researchBlock:       researchBlock || '(No live research data — use general knowledge.)',
    internalLinks:       internalLinksStr,
    externalLinks:       externalLinksStr,
  };
}

// ─── INTERPOLATOR ─────────────────────────────────────────────────────────────

/**
 * Replace all {{variable}} tokens in a template with context values.
 * Unknown keys are replaced with empty string (never crashes).
 */
function interpolate(template, context) {
  return template.replace(/\{\{(\w+)\}\}/g, function(_, key) {
    return context[key] !== undefined ? String(context[key]) : '';
  });
}

// ─── MAIN COMPILE ─────────────────────────────────────────────────────────────

/**
 * Compile the final master prompt.
 * Template priority: site > campaign > global article_config > DEFAULT_TEMPLATE.
 */
function compile(keyword, campaign, site, articleConf, options, researchBlock, internalLinksStr, externalLinksStr) {
  const rawTemplate =
    (site && site.master_prompt_template)                                            ||
    (campaign && campaign.article_config && campaign.article_config.master_prompt_template) ||
    (articleConf && articleConf.master_prompt_template)                              ||
    DEFAULT_TEMPLATE;

  const context = buildContext(keyword, campaign, site, articleConf, options, researchBlock, internalLinksStr, externalLinksStr);
  return interpolate(rawTemplate, context);
}

module.exports = { compile, buildContext, interpolate, DEFAULT_TEMPLATE };
