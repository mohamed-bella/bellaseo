/**
 * Schema Service — JSON-LD Authority Markup (Pillar 4)
 *
 * Generates structured data (JSON-LD) to inject into published articles:
 *   - Article / BlogPosting schema
 *   - FAQPage schema (from SERP "People Also Ask" data)
 *   - Person (author) schema
 *   - ItemList of citations
 */
const settingsService = require('./settingsService');

/**
 * Build a complete JSON-LD schema blob for an article.
 * @param {Object} article — article DB record (must include research_data)
 * @param {Object} campaign — campaign DB record
 * @returns {string} — an HTML <script> tag containing JSON-LD
 */
async function buildSchema(article, campaign) {
  try {
    // Load branding for author/organization context
    const branding = await settingsService.getSetting('branding').catch(() => ({}));

    const authorName = branding?.companyName || 'SEO Engine';
    const orgName = branding?.name || 'SEO Engine';
    const publishUrl = article.published_url || '';
    const publishDate = article.published_at || new Date().toISOString();
    const modifiedDate = article.updated_at || publishDate;

    // ─── 1. Main Article Schema ───────────────────────────────────────────────
    const articleSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: article.title,
      description: article.meta_description || '',
      url: publishUrl,
      datePublished: publishDate,
      dateModified: modifiedDate,
      wordCount: article.word_count || 0,
      image: article.featured_image_url || undefined,
      author: {
        '@type': 'Person',
        '@id': `${publishUrl || (campaign?.target_site?.api_url || 'https://example.com')}#author`,
        name: authorName,
        url: campaign?.target_site?.api_url || 'https://example.com',
      },
      publisher: {
        '@type': 'Organization',
        name: orgName,
        logo: {
          '@type': 'ImageObject',
          url: `${publishUrl}/favicon.ico`,
        },
      },
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': publishUrl,
      },
    };

    const schemas = [articleSchema];

    // ─── 2. FAQPage Schema (from SERP People Also Ask) ────────────────────────
    const paa = article.research_data?.peopleAlsoAsk;
    if (paa && paa.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: paa.map((q) => {
          const answerText = q.snippet || q.answer || `See the comprehensive answer inside the full article regarding: ${q.question}`;
          return {
            '@type': 'Question',
            name: q.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: answerText,
            },
          };
        }),
      };
      schemas.push(faqSchema);
    }

    // ─── 3. Citation ItemList ─────────────────────────────────────────────────
    const sources = article.research_data?.organic;
    if (sources && sources.length > 0) {
      const citationSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `Sources cited in: ${article.title}`,
        itemListElement: sources.slice(0, 5).map((src, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: src.title,
          url: src.link,
        })),
      };
      schemas.push(citationSchema);
    }

    // ─── Combine all schemas into a single <script> tag ───────────────────────
    const scriptTag = schemas
      .map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`)
      .join('\n');

    console.log(`[schema] ✅ JSON-LD generated for: "${article.title}" (${schemas.length} schemas)`);
    return { scriptTag, schemas };
  } catch (err) {
    console.error('[schema] Schema generation failed:', err.message);
    return { scriptTag: '', schemas: [] };
  }
}

module.exports = { buildSchema };
