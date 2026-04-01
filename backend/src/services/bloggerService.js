/**
 * Blogger Publishing Service
 * Publishes articles to Blogger via the Google Blogger API v3.
 * Requires a valid OAuth2 access token stored in site credentials.
 */
const axios = require('axios');

const BLOGGER_API = 'https://www.googleapis.com/blogger/v3';

/**
 * Publish an article to a Blogger blog
 * @param {Object} site - Site record (credentials_json contains { blog_id, access_token })
 * @param {Object} article - Article object from DB
 * @param {Object} options - { labels: [], isDraft: false }
 * @returns {Object} - { url, blogger_id }
 */
async function publishToBlogger(site, article, options = {}) {
  const creds = JSON.parse(site.credentials_json);
  const { blog_id, access_token } = creds;

  if (!blog_id || !access_token) {
    throw new Error('Blogger credentials must include blog_id and access_token');
  }

  const payload = {
    title: article.title,
    content: article.content,
    labels: options.labels || [],
  };

  const url = `${BLOGGER_API}/blogs/${blog_id}/posts/`;
  const params = { isDraft: options.isDraft || false };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-Type': 'application/json',
      },
      params,
      timeout: 30000,
    });

    return {
      blogger_id: response.data.id,
      url: response.data.url,
    };
  } catch (err) {
    const errorBody = err.response?.data ? JSON.stringify(err.response.data) : 'No response body';
    console.error('[blogger] Publish failed:', err.message, errorBody);
    const msg = err.response?.data?.error?.message || err.message;
    throw new Error(`${msg} (Body: ${errorBody})`);
  }
}

/**
 * Refresh OAuth access token using a refresh token
 */
async function refreshAccessToken(refreshToken, clientId, clientSecret) {
  const resp = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  return resp.data.access_token;
}

module.exports = { publishToBlogger, refreshAccessToken };
