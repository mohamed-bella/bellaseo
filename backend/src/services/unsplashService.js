const axios = require('axios');
const env = require('../config/env');

/**
 * Unsplash Service - Fetches high-quality images for articles.
 */
async function searchImage(query) {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY || env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    console.warn('[Unsplash] Access Key missing. Skipping image search.');
    return null;
  }

  try {
    const resp = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${accessKey}` }
    });

    const photo = resp.data.results?.[0];
    if (!photo) return null;

    return {
      url: photo.urls?.regular,
      thumb: photo.urls?.small,
      alt: photo.alt_description || query,
      credit: `Photo by ${photo.user?.name} on Unsplash`
    };
  } catch (err) {
    console.error('[Unsplash] Search failed:', err.message);
    return null;
  }
}

module.exports = { searchImage };
