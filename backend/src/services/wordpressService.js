/**
 * WordPress Publishing Service
 * Publishes articles to WordPress via the REST API using Application Passwords.
 */
const axios = require('axios');

/**
 * Get auth header from site credentials
 */
function getAuthHeader(creds) {
  const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

/**
 * Derive file extension from a Content-Type header string
 */
function extensionFromContentType(contentType) {
  if (!contentType) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('png'))  return 'png';
  if (contentType.includes('gif'))  return 'gif';
  return 'jpg';
}

/**
 * Upload a featured image from a URL to the WordPress Media Library.
 * Detects the real Content-Type from the image response so WEBP/PNG/GIF all work.
 * @returns {{ id: number, url: string } | null}
 */
async function uploadFeaturedImage(apiUrl, creds, imageUrl, slug = 'featured-image') {
  try {
    // 1. Download the image — capture actual content-type from response headers
    const imageResp = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 });
    const contentType = imageResp.headers['content-type'] || 'image/jpeg';
    const ext = extensionFromContentType(contentType);

    // Sanitise slug to make a safe filename
    const safeSlug = (slug || 'featured-image')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    const filename = `${safeSlug}.${ext}`;

    // 2. Upload to WP media endpoint
    const uploadResp = await axios.post(
      `${apiUrl}/wp-json/wp/v2/media`,
      imageResp.data,
      {
        headers: {
          ...getAuthHeader(creds),
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
        timeout: 30000,
        maxBodyLength: Infinity,
      }
    );

    console.log(`[wordpress] Featured image uploaded: ID ${uploadResp.data.id} — ${uploadResp.data.source_url}`);
    return { id: uploadResp.data.id, url: uploadResp.data.source_url };
  } catch (err) {
    console.warn('[wordpress] Featured image upload failed:', err.message);
    return null;
  }
}

/**
 * Get or create a category by name, return its ID
 */
async function resolveCategory(apiUrl, authHeader, categoryName) {
  if (!categoryName) return undefined;
  try {
    const search = await axios.get(`${apiUrl}/wp-json/wp/v2/categories`, {
      headers: authHeader,
      params: { search: categoryName, per_page: 1 },
    });
    if (search.data.length > 0) return [search.data[0].id];

    const create = await axios.post(`${apiUrl}/wp-json/wp/v2/categories`,
      { name: categoryName }, { headers: authHeader });
    return [create.data.id];
  } catch {
    return undefined;
  }
}

const settingsService = require('./settingsService');

/**
 * Fetch all Custom Post Types from a WordPress site
 */
async function getPostTypes(site) {
  const creds = JSON.parse(site.credentials_json);
  const authHeader = getAuthHeader(creds);
  try {
    const { data } = await axios.get(`${site.api_url}/wp-json/wp/v2/types`, { headers: authHeader });
    const excluded = ['attachment', 'nav_menu_item', 'wp_block', 'wp_navigation', 'wp_template', 'wp_template_part', 'wp_global_styles'];
    return Object.values(data)
      .filter((t) => !excluded.includes(t.slug))
      .map((t) => ({ slug: t.slug, name: t.name, rest_base: t.rest_base, rest_namespace: t.rest_namespace }));
  } catch (err) {
    console.warn('[wordpress] CPT fetch failed:', err.message);
    return [{ slug: 'post', name: 'Posts' }, { slug: 'page', name: 'Pages' }];
  }
}

/**
 * Publish an article to WordPress
 * @param {Object} site - Site record from DB (includes credentials_json)
 * @param {Object} article - Article object from DB
 * @param {Object} options - { category, featured_image_url, status, post_type }
 * @returns {Object} - { url, wp_id }
 */
async function publishToWordPress(site, article, options = {}) {
  let creds = site.credentials_json ? JSON.parse(site.credentials_json) : {};
  
  // Use fallbacks if specific site credentials are missing
  if (!creds.username || !creds.app_password) {
    const globalConfigs = await settingsService.getSetting('global_fallbacks');
    creds.username = creds.username || globalConfigs?.wp_user;
    creds.app_password = creds.app_password || globalConfigs?.wp_pass;
  }

  if (!creds.username || !creds.app_password) {
    throw new Error('WordPress credentials missing: No site-specific or global credentials found');
  }

  const authHeader = getAuthHeader(creds);
  const { api_url } = site;
  const postType = options.post_type || 'post';

  let endpoint = 'posts';
  let namespace = 'wp/v2';

  if (postType !== 'post') {
    try {
      // Fetch the type definition to find its exact rest_base and namespace (crucial for ACF and Plugins)
      const typeResp = await axios.get(`${api_url}/wp-json/wp/v2/types/${postType}`, { headers: authHeader });
      endpoint = typeResp.data.rest_base || postType;
      namespace = typeResp.data.rest_namespace || 'wp/v2';
    } catch (err) {
      console.warn(`[wordpress] ⚠️ Post type lookup failed for "${postType}" on ${api_url}. The site might not have this CPT or API access is restricted.`);
      if (postType === 'page') {
        endpoint = 'pages';
        namespace = 'wp/v2';
      } else if (postType === 'post') {
        endpoint = 'posts';
        namespace = 'wp/v2';
      } else {
        // For custom types, if the lookup fails, we'll try the slug but it's risky.
        console.warn(`[wordpress] Falling back to slug-based endpoint for "${postType}". This often fails if the CPT was from a different website.`);
        endpoint = postType;
        namespace = 'wp/v2';
      }
    }
  }

  // Resolve category
  const categories = await resolveCategory(api_url, authHeader, options.category);

  // Upload featured image if provided — pass article slug for meaningful filename
  let featured_media;
  let uploaded_image_url;
  if (options.featured_image_url) {
    const imgResult = await uploadFeaturedImage(
      api_url, creds, options.featured_image_url, options.slug || article.slug
    );
    if (imgResult) {
      featured_media = imgResult.id;
      uploaded_image_url = imgResult.url;
    }
  }

  // ── Build RankMath meta fields ──────────────────────────────────────────────
  // RankMath reads these via its REST API bridge. Setting them here removes all
  // "5 critical errors" from the RankMath checklist automatically on publish.
  const rankMathKeyword = options.rank_math_focus_keyword || '';
  const siteBaseUrl     = api_url.replace(/\/+$/, '');
  const canonicalUrl    = `${siteBaseUrl}/${article.slug}/`;

  const rankMathMeta = {
    // ─── Focus Keyword ──────────────────────────────────────────────────────
    rank_math_focus_keyword: rankMathKeyword,

    // ─── SEO Title (with keyword, power word, and number baked in) ──────────
    // RankMath reads this field first; the WP native `title` is a fallback.
    rank_math_title: article.title,

    // ─── SEO Meta Description (with keyword and CTA) ────────────────────────
    rank_math_description: article.meta_description || '',

    // ─── Canonical URL ──────────────────────────────────────────────────────
    rank_math_canonical_url: canonicalUrl,

    // ─── Robots / Indexing ──────────────────────────────────────────────────
    rank_math_robots: JSON.stringify(['index', 'follow']),

    // ─── OpenGraph (used by RankMath social preview) ─────────────────────────
    rank_math_og_title:       article.title,
    rank_math_og_description: article.meta_description || '',

    // ─── Twitter Card ────────────────────────────────────────────────────────
    rank_math_twitter_title:       article.title,
    rank_math_twitter_description: article.meta_description || '',
    rank_math_twitter_card_type:   'summary_large_image',

    // ─── Schema type hint for RankMath ──────────────────────────────────────
    rank_math_schema_Article: JSON.stringify({ '@type': 'BlogPosting' }),
  };

  // Publish post
  const payload = {
    title: article.title,
    content: article.content,
    slug: article.slug,
    excerpt: article.meta_description,
    status: options.status || 'publish',
    categories: postType === 'post' ? categories : undefined,
    featured_media,
    meta: rankMathMeta,
    // Specialized payload for Web Stories
    story_data: namespace === 'web-stories/v1' ? {
      version: 27,
      pages: [{
        id: 'p1',
        elements: [{
          id: 'e1',
          type: 'text',
          x: 40, y: 40, width: 320, height: 100,
          content: article.title
        }]
      }]
    } : undefined
  };

  try {
    const response = await axios.post(`${api_url}/wp-json/${namespace}/${endpoint}`, payload, {
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      timeout: 30000,
    });

    return {
      wp_id: response.data.id,
      url: response.data.link,
      featured_media_id: featured_media || null,
      featured_image_wp_url: uploaded_image_url || null,
    };
  } catch (err) {
    const body = err.response?.data ? JSON.stringify(err.response.data) : 'No response body';
    console.error(`[wordpress] Publish failed to ${namespace}/${endpoint}:`, err.message, body);
    // Re-throw with more context
    const betterMsg = err.response?.data?.message || err.message;
    const error = new Error(`${betterMsg} (Body: ${body})`);
    error.response = err.response;
    throw error;
  }
}

/**
 * Fetch deep diagnostics for a WordPress site (Plugins, Themes, Settings)
 */
async function getSiteDiagnostics(site) {
  let creds = site.credentials_json ? JSON.parse(site.credentials_json) : {};
  if (!creds.username || !creds.app_password) {
    const globalConfigs = await settingsService.getSetting('global_fallbacks');
    creds.username = creds.username || globalConfigs?.wp_user;
    creds.app_password = creds.app_password || globalConfigs?.wp_pass;
  }

  if (!creds.username || !creds.app_password) {
    throw new Error('WordPress diagnostics failed: No credentials');
  }

  const authHeader = getAuthHeader(creds);
  const { api_url } = site;

  try {
    const [plugins, themes, settings] = await Promise.all([
      axios.get(`${api_url}/wp-json/wp/v2/plugins`, { headers: authHeader, timeout: 10000 }).catch(() => ({ data: [] })),
      axios.get(`${api_url}/wp-json/wp/v2/themes`, { headers: authHeader, timeout: 10000 }).catch(() => ({ data: [] })),
      axios.get(`${api_url}/wp-json/wp/v2/settings`, { headers: authHeader, timeout: 10000 }).catch(() => ({ data: {} }))
    ]);

    return {
      plugins: plugins.data.map((p) => ({ 
        name: typeof p.name === 'object' ? p.name.rendered : p.name, 
        version: p.version, 
        status: p.status, 
        plugin_uri: p.plugin_uri,
        description: typeof p.description === 'object' ? p.description.rendered : p.description 
      })),
      themes: themes.data.map((t) => ({ 
        name: typeof t.name === 'object' ? t.name.rendered : t.name, 
        version: t.version, 
        status: t.status, 
        theme_uri: t.theme_uri,
        screenshot: t.screenshot 
      })),
      site_info: {
        title: typeof settings.data.title === 'object' ? settings.data.title.rendered : (settings.data.title || ''),
        description: typeof settings.data.description === 'object' ? settings.data.description.rendered : (settings.data.description || ''),
        timezone: settings.data.timezone,
        site_url: api_url
      }
    };
  } catch (err) {
    console.error(`[wordpress] Diagnostics failed for ${api_url}:`, err.message);
    throw new Error(`WordPress connection failed: ${err.message}`);
  }
}

/**
 * Update an existing WordPress post's content (used by refreshWorker)
 * @param {Object} site - Site record from DB
 * @param {number} wpPostId - WordPress post numeric ID
 * @param {string} updatedContent - New HTML content
 * @returns {{ success: boolean }}
 */
async function updatePost(site, wpPostId, updatedContent) {
  let creds = site.credentials_json ? JSON.parse(site.credentials_json) : {};
  if (!creds.username || !creds.app_password) {
    const globalConfigs = await settingsService.getSetting('global_fallbacks');
    creds.username = creds.username || globalConfigs?.wp_user;
    creds.app_password = creds.app_password || globalConfigs?.wp_pass;
  }

  if (!creds.username || !creds.app_password) {
    throw new Error('WordPress credentials missing for post update');
  }

  const authHeader = getAuthHeader(creds);
  await axios.post(
    `${site.api_url}/wp-json/wp/v2/posts/${wpPostId}`,
    {
      content: updatedContent,
      modified: new Date().toISOString(),
    },
    {
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      timeout: 30000,
    }
  );

  console.log(`[wordpress] ✅ Post ${wpPostId} updated on ${site.api_url}`);
  return { success: true };
}

module.exports = { publishToWordPress, updatePost, getPostTypes, getSiteDiagnostics };

