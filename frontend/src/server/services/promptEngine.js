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

// ─── ABSOLUTE WRITING RULES ──────────────────────────────────────────────────
// Hardcoded rules that apply to EVERY AI request to ensure human-grade quality.
const ABSOLUTE_WRITING_RULES = `
ABSOLUTE WRITING RULES — NON-NEGOTIABLE. APPLY TO EVERY WORD YOU WRITE.

**BANNED WORDS AND PHRASES — never use any of these, ever:**
hidden gem, breathtaking, magical, unforgettable, rich culture, vibrant, tapestry, nestled, bustling, seamlessly, game-changer, cutting-edge, leverage, delve, embark, journey (used metaphorically), unlock, unleash, elevate, foster, beacon, cornerstone, pivotal, paramount, robust, streamline, revolutionize, transformative, innovative, holistic, synergy, ecosystem, landscape (used metaphorically), realm, sphere, dynamic, impactful, actionable, scalable, sustainable (used vaguely).

hit different, rewired my brain, bucket list, once in a lifetime, living rent-free, no notes, I'm still not over it, a masterclass in, deeply moving, truly inspiring, absolutely, certainly, of course, it goes without saying, needless to say, I cannot stress enough, I cannot emphasize enough, the fact of the matter is, at the end of the day, when it comes to, in terms of, it is what it is, think outside the box, move the needle, circle back, take it to the next level, at its core, in the realm of, stands as, serves as, remains as, is designed to, aims to provide, touch base, as an AI language model, in today's world, in today's fast-paced world.

**BANNED SENTENCE PATTERNS:**
- "It's not just a [noun], it's a [noun]." Kill this construction on sight. Rewrite the sentence completely.
- Em dashes (—) used as pauses or asides. Replace with a period, a parenthesis, or a new sentence. 
- Openers that define the topic: "Morocco is a country where...", "[Topic] is one of the most...", "When it comes to [topic]..."
- Transition fillers at the start of paragraphs: Furthermore, Moreover, In addition, Additionally, Consequently, Nevertheless, Nonetheless, It is worth noting that, It is important to mention that.
- Closing sentences that announce themselves: "In conclusion,", "To summarize,", "To wrap up,", "As we have seen,", "All in all,".
- Overly clean four-sentence paragraphs with identical rhythm. Real writing has short sentences. Fragments. Then a longer one that earns its length.

**THE TEST BEFORE YOU WRITE ANY SENTENCE:**
Would a real experienced human actually say this, or does it sound like a content brief came to life? If it sounds like a content brief — rewrite it. Specificity is the only cure. Replace vague praise with a real detail. Replace a metaphor with a price, a place name, a time of day, a person's reaction.
`.trim();

// ─── DEFAULT MASTER TEMPLATE ──────────────────────────────────────────────────
// This is the fallback used ONLY when no custom template is set at any level.
// It is intentionally minimal to avoid fighting persona prompts defined in
// campaign.prompt_template. Those will be used as the system identity instead.

const DEFAULT_TEMPLATE = `
You are {{authorName}}, an expert in {{niche}}.
{{authorBio}}

Write a comprehensive, human-sounding article about "{{keyword}}" for {{targetAudience}}.
Language: {{language}}. Tone: {{tone}}. Target length: {{targetLength}} words.

SEO requirements:
- Include "{{keyword}}" in the H1 title and naturally throughout the body.
- Weave in secondary keywords where they fit: {{secondaryKeywords}}.
- Use at least two H2 or H3 subheadings that reference the topic.
- Output clean HTML only — no markdown, no code fences.

Structure: introduction with a hook, body sections with H2/H3 headings, {{faqDirective}}, {{conclusionDirective}}.

Internal links to use naturally: {{internalLinks}}
External authority sources to reference: {{externalLinks}}

Live research context (use for facts and citations):
{{researchBlock}}

{{campaignDirectives}}
`.trim();


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
  // Priority: site > campaign.article_config > global articleConf > campaign.prompt_template (as full system identity) > DEFAULT_TEMPLATE
  // NOTE: campaign.prompt_template (the "Master Project Instruction" the user types) is checked
  // as a full master template — NOT as a footnote in campaignDirectives. This means if a campaign
  // has a persona prompt set, it becomes the entire system identity, not a bullet point.
  const rawTemplate =
    (site && site.master_prompt_template)                                                    ||
    (campaign && campaign.article_config && campaign.article_config.master_prompt_template)  ||
    (articleConf && articleConf.master_prompt_template)                                      ||
    (campaign && campaign.prompt_template)                                                    ||
    DEFAULT_TEMPLATE;

  const context = buildContext(keyword, campaign, site, articleConf, options, researchBlock, internalLinksStr, externalLinksStr);
  const userTemplate = interpolate(rawTemplate, context);

  // Prepend the Absolute Writing Rules to the final output so they are always at the top of the system prompt.
  return `${ABSOLUTE_WRITING_RULES}\n\n${userTemplate}`;
}

module.exports = { compile, buildContext, interpolate, DEFAULT_TEMPLATE };
