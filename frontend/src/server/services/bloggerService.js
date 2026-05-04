/**
 * Blogger Publishing Service
 * Full Blogger API v3 integration: publish, test, connection check, token refresh.
 */
'use strict';

const axios = require('axios');

const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';
const TOKEN_URL   = 'https://oauth2.googleapis.com/token';

// ─── TOKEN MANAGEMENT ─────────────────────────────────────────────────────────

/**
 * Return a valid access token — refresh if client creds + refresh_token are present.
 * Falls back to stored access_token if no refresh capability.
 */
async function getAccessToken(creds) {
  if (creds.refresh_token && creds.client_id && creds.client_secret) {
    try {
      const resp = await axios.post(TOKEN_URL, {
        client_id:     creds.client_id,
        client_secret: creds.client_secret,
        refresh_token: creds.refresh_token,
        grant_type:    'refresh_token',
      }, { timeout: 10000 });
      return resp.data.access_token;
    } catch (err) {
      console.warn('[blogger] Token refresh failed, falling back to stored token:', err.message);
    }
  }
  if (!creds.access_token) throw new Error('No access_token available. Add an OAuth access token or refresh credentials.');
  return creds.access_token;
}

function authHeaders(accessToken) {
  return {
    Authorization:  `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}

// ─── CONNECTION TEST ───────────────────────────────────────────────────────────

/**
 * Fetch blog metadata to verify credentials.
 * Returns { name, url, posts_total, description }
 */
async function getBlogInfo(site) {
  const creds       = JSON.parse(site.credentials_json);
  const accessToken = await getAccessToken(creds);
  const blogId      = creds.blog_id;

  if (!blogId) throw new Error('blog_id is required in Blogger credentials.');

  const resp = await axios.get(`${BLOGGER_API}/blogs/${blogId}`, {
    headers: authHeaders(accessToken),
    timeout: 10000,
  });

  return {
    name:        resp.data.name,
    url:         resp.data.url,
    description: resp.data.description || '',
    posts_total: resp.data.posts?.totalItems || 0,
    blog_id:     blogId,
  };
}

// ─── TEST POST ─────────────────────────────────────────────────────────────────

async function publishTestPost(site) {
  const creds       = JSON.parse(site.credentials_json);
  const accessToken = await getAccessToken(creds);
  const blogId      = creds.blog_id;
  const now         = new Date().toUTCString();

  const payload = {
    title:   `[TEST] SEO Engine Connection Probe — ${now}`,
    content: `<p>Automated connection test from <strong>BellaSEO</strong> created on ${now}.</p>
<p>Publishing pipeline is operational. Please delete this post.</p>`,
    labels:  ['seo-engine-test'],
  };

  const resp = await axios.post(
    `${BLOGGER_API}/blogs/${blogId}/posts/`,
    payload,
    { headers: authHeaders(accessToken), params: { isDraft: true }, timeout: 20000 }
  );

  return {
    blogger_id: resp.data.id,
    url:        resp.data.url || `https://www.blogger.com/blog/${blogId}`,
  };
}

async function deletePost(site, postId) {
  const creds       = JSON.parse(site.credentials_json);
  const accessToken = await getAccessToken(creds);
  const blogId      = creds.blog_id;

  await axios.delete(
    `${BLOGGER_API}/blogs/${blogId}/posts/${postId}`,
    { headers: authHeaders(accessToken), timeout: 15000 }
  );
}

// ─── IMAGE EMBEDDING ──────────────────────────────────────────────────────────

/**
 * Prepend a featured image to article HTML content.
 * Blogger accepts external image URLs directly in HTML.
 */
function embedFeaturedImage(htmlContent, imageUrl, altText, title) {
  if (!imageUrl) return htmlContent;
  const safeAlt   = (altText || title || '').replace(/"/g, '&quot;');
  const safeTitle = (title || altText || '').replace(/"/g, '&quot;');
  const imageHtml = `<div class="featured-image" style="text-align:center;margin-bottom:24px;">
  <img src="${imageUrl}" alt="${safeAlt}" title="${safeTitle}" loading="lazy" style="max-width:100%;height:auto;border-radius:8px;" />
</div>\n\n`;
  return imageHtml + htmlContent;
}

// ─── SEO META BLOCK ───────────────────────────────────────────────────────────

/**
 * Inject a hidden SEO meta block at the end of the post.
 * Blogger doesn't support custom meta tags per-post natively,
 * but we embed JSON-LD schema directly in the content.
 */
function buildSeoFooter(article, focusKeyword) {
  const schema = {
    '@context':    'https://schema.org',
    '@type':       'BlogPosting',
    headline:      article.title,
    description:   article.meta_description || '',
    keywords:      focusKeyword || '',
    datePublished: new Date().toISOString(),
    author: {
      '@type': 'Person',
      name:    'BellaSEO',
    },
  };
  if (article.featured_image_url) {
    schema.image = article.featured_image_url;
  }
  return `\n\n<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

// ─── MAIN PUBLISH ──────────────────────────────────────────────────────────────

/**
 * Publish an article to a Blogger blog.
 * @param {Object} site    - Site record (credentials_json has { blog_id, access_token, refresh_token?, client_id?, client_secret? })
 * @param {Object} article - Article object from DB
 * @param {Object} options - { labels: [], isDraft: false, focusKeyword: '' }
 * @returns {{ blogger_id, url }}
 */
async function publishToBlogger(site, article, options = {}) {
  const creds       = JSON.parse(site.credentials_json);
  const accessToken = await getAccessToken(creds);
  const blogId      = creds.blog_id;

  if (!blogId) throw new Error('blog_id is required in Blogger credentials.');

  // Build labels from options + focus keyword
  const labels = [...(options.labels || [])];
  if (options.focusKeyword && !labels.includes(options.focusKeyword)) {
    labels.push(options.focusKeyword);
  }
  // Deduplicate, trim, limit to 20 labels
  const cleanLabels = [...new Set(labels.map(l => l.trim()).filter(Boolean))].slice(0, 20);

  // Embed featured image at top of content
  let content = embedFeaturedImage(
    article.content,
    article.featured_image_url,
    options.focusKeyword || article.title,
    article.title
  );

  // Append JSON-LD SEO footer
  content += buildSeoFooter(article, options.focusKeyword || '');

  const payload = {
    title:   article.title,
    content,
    labels:  cleanLabels,
  };

  const url = `${BLOGGER_API}/blogs/${blogId}/posts/`;

  try {
    const response = await axios.post(url, payload, {
      headers: authHeaders(accessToken),
      params:  { isDraft: options.isDraft || false },
      timeout: 30000,
    });

    return {
      blogger_id: response.data.id,
      url:        response.data.url,
    };
  } catch (err) {
    const errorBody = err.response?.data ? JSON.stringify(err.response.data) : 'No response body';
    console.error('[blogger] Publish failed:', err.message, errorBody);
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`Blogger publish failed: ${msg}`);
  }
}

/**
 * Refresh OAuth access token using a refresh token (explicit helper for external callers).
 */
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const resp = await axios.post(TOKEN_URL, {
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type:    'refresh_token',
  });
  return resp.data.access_token;
}

module.exports = {
  publishToBlogger,
  refreshAccessToken,
  getBlogInfo,
  publishTestPost,
  deletePost,
  getAccessToken,
  embedFeaturedImage,
};
