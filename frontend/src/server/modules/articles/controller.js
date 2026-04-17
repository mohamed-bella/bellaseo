const supabase = require('../../config/database');
const { ARTICLE_STATUS } = require('../../config/constants');
const aiService = require('../../services/aiService');
const wordpressService = require('../../services/wordpressService');
const bloggerService = require('../../services/bloggerService');
// Inline schema generator (server-side, no TS)
function generateSchemaMarkup(article) {
  const schemas = [];

  function stripHtml(html) {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.meta_description || stripHtml(article.content).substring(0, 160),
    datePublished: article.created_at || new Date().toISOString(),
    dateModified: new Date().toISOString(),
    author: { '@type': 'Organization', name: 'Editorial Team' },
  };
  if (article.published_url) articleSchema.url = article.published_url;
  if (article.featured_image_url) articleSchema.image = { '@type': 'ImageObject', url: article.featured_image_url };
  schemas.push(articleSchema);

  // FAQ schema
  const content = article.content || '';
  const faqs = [];
  const sectionPattern = /<h[23][^>]*>(.*?)<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = sectionPattern.exec(content)) !== null) {
    const q = m[1].replace(/<[^>]*>/g, '').trim();
    const a = m[2].replace(/<[^>]*>/g, '').trim();
    if (q.length > 10 && a.length > 20 && (q.endsWith('?') || /^(what|how|why|when|where|which|who|can|is|are|do|does|will|should)/i.test(q))) {
      faqs.push({ question: q, answer: a });
    }
    if (faqs.length >= 10) break;
  }
  if (faqs.length >= 2) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
    });
  }

  // HowTo schema
  if (/<h[12][^>]*>.*?how to.*?<\/h[12]>/i.test(content)) {
    const listMatch = content.match(/<ol[^>]*>([\s\S]*?)<\/ol>/i);
    if (listMatch) {
      const steps = [...listMatch[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s[1].replace(/<[^>]*>/g, '').trim() }))
        .filter(s => s.text.length > 10);
      if (steps.length >= 3) {
        schemas.push({ '@context': 'https://schema.org', '@type': 'HowTo', name: article.title, step: steps });
      }
    }
  }

  return schemas.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
}

async function publishSingleArticle(articleId, io) {
  try {
    const { data: article } = await supabase.from('articles').select('*, keywords!inner(campaign_id)').eq('id', articleId).single();
    if (!article) return;
    
    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', article.keywords.campaign_id).single();
    if (!campaign) {
      console.error('[publishSingleArticle] Campaign not found for article:', articleId);
      return;
    }

    let site;
    if (campaign.target_site_id) {
      const { data } = await supabase.from('sites').select('*').eq('id', campaign.target_site_id).single();
      site = data;
    } 

    if (!site) {
      console.error('[publishSingleArticle] No target site configured for campaign:', campaign.name);
      if (io) io.emit('article:publishError', { articleId, error: 'Target site is not configured for this project. Please edit the project and select a website.' });
      return;
    }

    const cleanArticle = { ...article }; delete cleanArticle.keywords;

    // Inject JSON-LD schema markup before content
    const schemaMarkup = generateSchemaMarkup(cleanArticle);
    const articleWithSchema = { ...cleanArticle, content: schemaMarkup + '\n' + (cleanArticle.content || '') };

    let publishResult;
    if (site.type === 'wordpress') {
      publishResult = await wordpressService.publishToWordPress(site, articleWithSchema, { status: 'publish', post_type: campaign.target_cpt || 'post', featured_image_url: cleanArticle.featured_image_url });
    } else if (site.type === 'blogger') {
      publishResult = await bloggerService.publishToBlogger(site, articleWithSchema, { isDraft: false });
    }

    if (publishResult && publishResult.url) {
      const { data: updated } = await supabase.from('articles')
        .update({ status: ARTICLE_STATUS.PUBLISHED, published_url: publishResult.url, published_at: new Date().toISOString() })
        .eq('id', articleId).select().single();
      if (io) io.emit('article:updated', updated);
      if (io) io.emit('article:statusChanged', updated);
    }
  } catch (e) {
    console.error('[Immediate Publish Failed]:', e.message);
    const errorMsg = e.response?.data?.message || e.message;
    if (io) io.emit('article:publishError', { articleId, error: errorMsg });
  }
}

const list = async (req, res, next) => {
  try {
    const { keyword_id, status, search, campaign_id, has_research } = req.query;
    let query = supabase.from('articles').select('*, keywords!inner(main_keyword, campaign_id, campaigns(name))').order('created_at', { ascending: false });
    
    if (keyword_id) query = query.eq('keyword_id', keyword_id);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);
    if (campaign_id) query = query.eq('keywords.campaign_id', campaign_id);
    if (has_research) query = query.not('research_data', 'is', null);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .select('*, keywords(main_keyword, secondary_keywords, intent)').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Article not found' });
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { keyword_id, title, content, meta_description } = req.body;
    if (!keyword_id) return res.status(400).json({ error: 'keyword_id is required' });
    const { data, error } = await supabase.from('articles')
      .insert({ keyword_id, title, content, meta_description, status: ARTICLE_STATUS.DRAFT })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:updated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:statusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('articles')
      .update({ status: ARTICLE_STATUS.APPROVED, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    publishSingleArticle(req.params.id, req.app.get('io'));
    req.app.get('io').emit('article:approved', data);
    res.json(data);
  } catch (err) { next(err); }
};

const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status: ARTICLE_STATUS.REJECTED, rejection_reason: reason, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:rejected', data);
    res.json(data);
  } catch (err) { next(err); }
};

const regenerate = async (req, res, next) => {
  try {
    const { prompt_override, target_length, style } = req.body; // Support frontend dynamic regeneration completely
    const { data: article, error: aErr } = await supabase.from('articles')
      .select('*, keywords(*)').eq('id', req.params.id).single();
    if (aErr) throw aErr;
    
    // Pass dynamic configuration to generation service
    const generated = await aiService.generateArticle(article.keywords, {
        promptOverride: prompt_override,
        targetLength: target_length,
        style: style
    });

    const { data, error } = await supabase.from('articles')
      .update({ ...generated, status: ARTICLE_STATUS.REVIEW, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    req.app.get('io').emit('article:regenerated', data);
    res.json(data);
  } catch (err) { next(err); }
};

const bulkDelete = async (req, res, next) => {
  try {
    const { ids } = req.body;
    const { error } = await supabase.from('articles').delete().in('id', ids);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

const bulkUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    const { data, error } = await supabase.from('articles')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids).select('id, status');
    if (error) throw error;
    
    // If approving, trigger immediate background publishing for each
    if (status === ARTICLE_STATUS.APPROVED) {
      ids.forEach(id => publishSingleArticle(id, req.app.get('io')));
    }

    req.app.get('io').emit('articles:bulkStatusChanged', data);
    res.json(data);
  } catch (err) { next(err); }
};

const clearAll = async (req, res, next) => {
  try {
    const { error } = await supabase.from('articles').delete().not('id', 'is', null);
    if (error) throw error;
    req.app.get('io').emit('articles:cleared');
    res.status(204).send();
  } catch (err) { next(err); }
};

// ── Internal Link Suggestions ─────────────────────────────────────────────────
const linkSuggestions = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Fetch current article
    const { data: current } = await supabase
      .from('articles')
      .select('title, content, keyword_id, keywords(main_keyword, secondary_keywords)')
      .eq('id', id)
      .single();

    if (!current) return res.status(404).json({ error: 'Article not found' });

    // Fetch candidate articles (published or approved, exclude self)
    const { data: candidates } = await supabase
      .from('articles')
      .select('id, title, slug, published_url, status, keywords(main_keyword)')
      .in('status', [ARTICLE_STATUS.PUBLISHED, ARTICLE_STATUS.APPROVED])
      .neq('id', id)
      .limit(100);

    if (!candidates || candidates.length === 0) return res.json([]);

    // Build a word-frequency map for current article
    function tokenize(text) {
      return (text || '')
        .toLowerCase()
        .replace(/<[^>]*>/g, ' ')
        .split(/\W+/)
        .filter(w => w.length > 3);
    }

    const stopWords = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'will', 'they', 'their', 'also', 'more', 'your', 'what', 'when', 'which', 'into', 'than', 'then', 'some', 'most', 'over', 'such', 'these', 'those', 'were', 'where', 'just', 'like', 'very']);

    const currentWords = new Set(tokenize(`${current.title} ${current.keywords?.main_keyword || ''} ${current.content}`).filter(w => !stopWords.has(w)));

    const scored = candidates.map(c => {
      const candidateWords = tokenize(`${c.title} ${c.keywords?.main_keyword || ''}`).filter(w => !stopWords.has(w));
      const overlap = candidateWords.filter(w => currentWords.has(w)).length;
      const relevance = candidateWords.length > 0 ? overlap / Math.max(candidateWords.length, 5) : 0;

      // Derive anchor text from candidate keyword or title
      const kw = c.keywords?.main_keyword || '';
      const anchorText = kw.length > 0 && kw.length < 50 ? kw : c.title.split(' ').slice(0, 5).join(' ');

      return {
        id: c.id,
        title: c.title,
        slug: c.slug || c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        published_url: c.published_url,
        main_keyword: kw,
        anchor_text: anchorText,
        relevance: Math.min(1, relevance),
      };
    });

    // Return top 8 by relevance, minimum 0.05 score
    const results = scored
      .filter(s => s.relevance >= 0.05)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 8);

    res.json(results);
  } catch (err) { next(err); }
};

module.exports = {
  list, get, create, update, updateStatus,
  approve, reject, regenerate, clearAll,
  bulkDelete, bulkUpdateStatus, linkSuggestions
};
