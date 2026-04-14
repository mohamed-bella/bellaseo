const axios = require('axios');

/**
 * YouTube Service — searches for a relevant video to embed in articles.
 *
 * Strategy: NO API KEY required.
 *   1. Scrape YouTube's HTML search page to extract the first videoId from
 *      the embedded ytInitialData JSON blob.
 *   2. Confirm the video + get title/thumbnail via YouTube's official
 *      oEmbed endpoint (free, unauthenticated, always reliable).
 *
 * Fallback: if page scraping fails (e.g., YouTube changes markup), we
 * return null gracefully so article generation continues uninterrupted.
 */

const YT_SEARCH_BASE = 'https://www.youtube.com/results';
const YT_OEMBED_BASE  = 'https://www.youtube.com/oembed';

/**
 * Extract the first videoId from the raw HTML of a YouTube search page.
 * YouTube embeds a `var ytInitialData = {...}` JSON blob we can parse.
 */
function extractVideoId(html) {
  try {
    // Fast regex: grab first "videoId":"<id>" occurrence in the page
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Verify a videoId via oEmbed and return { id, title, embedUrl }.
 * oEmbed is an official, free, no-key YouTube endpoint.
 */
async function oEmbedLookup(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const { data } = await axios.get(YT_OEMBED_BASE, {
    params: { url: videoUrl, format: 'json' },
    timeout: 8000,
  });
  return {
    id: videoId,
    title: data.title,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}

/**
 * Search YouTube for a relevant video without any API key.
 * @param {string} query - The search term (typically the article's main keyword)
 * @returns {Promise<{ id: string, title: string, embedUrl: string } | null>}
 */
async function searchVideo(query) {
  try {
    // 1. Hit the YouTube search page — mimic a real browser to avoid bot blocks
    const resp = await axios.get(YT_SEARCH_BASE, {
      params: { search_query: query },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      timeout: 12000,
    });

    // 2. Extract the first videoId from the page HTML
    const videoId = extractVideoId(resp.data);
    if (!videoId) {
      console.warn('[YouTube] Could not extract videoId from search page.');
      return null;
    }

    // 3. Validate + get title via oEmbed (official, no token needed)
    const video = await oEmbedLookup(videoId);
    console.log(`[YouTube] Found: "${video.title}" (${video.id})`);
    return video;

  } catch (err) {
    // Non-fatal — article generation continues without a video
    console.warn('[YouTube] Video search failed (no key needed but fetch failed):', err.message);
    return null;
  }
}

module.exports = { searchVideo };
