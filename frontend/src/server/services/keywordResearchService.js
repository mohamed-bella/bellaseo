/**
 * Keyword Research Service
 * ─────────────────────────────────────────────────────────────
 * Free, unlimited SEO keyword research using:
 *  - Google Autocomplete (suggestions)
 *  - Google Trends API (trend data)
 *  - Axios-based SERP data (light, avoids Puppeteer for now)
 *  - Custom algorithms (Volume, KD, Opportunity scoring)
 */

const axios = require('axios');

// ─── Utility ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const randomDelay = () => sleep(1000 + Math.random() * 2000);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

// ─── 1. Keyword Suggestions (Google Autocomplete) ─────────────────────────────

async function getAutocomplete(keyword) {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}`;
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': randomUA() },
      timeout: 8000,
    });
    // Response format: [query, [suggestion1, suggestion2, ...]]
    const suggestions = Array.isArray(data) && Array.isArray(data[1]) ? data[1] : [];
    return suggestions.slice(0, 15);
  } catch (err) {
    console.warn('[KeywordResearch] Autocomplete fetch failed:', err.message);
    return [];
  }
}

// ─── 2. Google Trends Data ────────────────────────────────────────────────────

async function getTrends(keyword) {
  try {
    const googleTrends = require('google-trends-api');
    const rawData = await googleTrends.interestOverTime({
      keyword,
      startTime: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000), // 12 months ago
      granularTimeResolution: true,
    });
    const parsed = JSON.parse(rawData);
    const timeline = parsed?.default?.timelineData ?? [];
    const points = timeline.map((p) => ({
      date: p.formattedTime,
      value: p.value?.[0] ?? 0,
    }));
    const avgScore = points.length
      ? Math.round(points.reduce((s, p) => s + p.value, 0) / points.length)
      : 0;
    return { points, score: avgScore };
  } catch (err) {
    console.warn('[KeywordResearch] Trends fetch failed:', err.message);
    // Return mock trend points if API fails (network restricted env)
    const points = Array.from({ length: 12 }, (_, i) => ({
      date: new Date(Date.now() - (11 - i) * 30 * 24 * 60 * 60 * 1000)
        .toLocaleString('en', { month: 'short', year: '2-digit' }),
      value: 20 + Math.floor(Math.random() * 60),
    }));
    return { points, score: 45, isFallback: true };
  }
}

// ─── 3. SERP Analysis via Google Search ──────────────────────────────────────

async function scrapeSERP(keyword) {
  try {
    await randomDelay();
    const url = `https://www.google.com/search?q=${encodeURIComponent(keyword)}&num=10&hl=en`;
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': randomUA(),
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 12000,
    });

    // Parse results count
    const countMatch = html.match(/About ([\d,]+) results/);
    const resultsCount = countMatch
      ? parseInt(countMatch[1].replace(/,/g, ''), 10)
      : 5000000;

    // Parse organic results from HTML using regex (light approach)
    const results = [];
    const blockRegex = /<div[^>]*class="[^"]*tF2Cxc[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g;
    const titleRegex = /<h3[^>]*>(.*?)<\/h3>/;
    const urlRegex = /<a[^>]+href="(https?:\/\/[^"]+)"/;
    const snippetRegex = /<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/;
    const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();

    let match;
    while ((match = blockRegex.exec(html)) !== null && results.length < 10) {
      const block = match[1];
      const titleM = titleRegex.exec(block);
      const urlM = urlRegex.exec(block);
      const snippetM = snippetRegex.exec(block);
      if (titleM && urlM) {
        results.push({
          title: stripTags(titleM[1]),
          url: urlM[1].split('&')[0],
          snippet: snippetM ? stripTags(snippetM[1]).substring(0, 160) : '',
        });
      }
    }

    // Fallback: lighter regex parse for urls
    if (results.length === 0) {
      const hrefMatches = html.matchAll(/href="(https?:\/\/(?!google)[^"]+)"/g);
      const seen = new Set();
      for (const m of hrefMatches) {
        const u = m[1].split('?')[0];
        if (!seen.has(u) && results.length < 10) {
          seen.add(u);
          results.push({ title: u, url: u, snippet: '' });
        }
      }
    }

    return { results, resultsCount };
  } catch (err) {
    console.warn('[KeywordResearch] SERP scrape failed:', err.message);
    return { results: [], resultsCount: 1000000 };
  }
}

// ─── 4. Volume Estimation (Smarter Logic) ──────────────────────────────────

function calculateVolume(trendsScore, resultsCount) {
  // Normalize results count on a logarithmic scale (log10 of results)
  // 1k results = 3.0, 1M results = 6.0, 100M results = 8.0
  const logResults = Math.log10(Math.max(resultsCount, 100)); 
  const resultsNorm = Math.min(100, (logResults / 8) * 100);

  // Trends score from Google is the most accurate real intent
  // Combine: 70% Trends (Intent) + 30% Index Size (Popularity)
  const volume = Math.round(trendsScore * 0.7 + resultsNorm * 0.3);
  
  return Math.min(100, Math.max(5, volume));
}

// ─── 5. Keyword Difficulty (Smarter Authority-Based KD) ──────────────────────

function calculateKD(results, resultsCount, keyword) {
  const kw = keyword.toLowerCase();
  
  // Base Difficulty starts from the "Index Density"
  // If there are 10M+ results for a keyword, it's NEVER "Easy" (0).
  const logResults = Math.log10(Math.max(resultsCount, 100));
  let baseKD = (logResults / 9) * 40; // Max 40 points from global competition

  let authorityScore = 0;
  const highAuthorityDomains = [
    'wikipedia.org', 'tripadvisor.com', 'lonelyplanet.com', 'booking.com', 
    'expedia.com', 'forbes.com', 'nytimes.com', 'bbc.com', 'cnn.com',
    'reddit.com', 'quora.com', 'amazon.com', 'youtube.com', 'gov', 'edu',
    'healthline.com', 'mayoclinic.org', 'webmd.com', 'investopedia.com'
  ];

  if (!results || results.length === 0) return Math.round(baseKD + 20);

  results.forEach((r, i) => {
    const url = r.url.toLowerCase();
    const title = r.title.toLowerCase();
    
    // 1. Precise Title Match (Big difficulty factor in top 10)
    if (title.includes(kw)) authorityScore += 6;
    
    // 2. Fragmented Title Match (still difficult)
    const words = kw.split(' ');
    if (words.every(w => title.includes(w))) authorityScore += 3;

    // 3. Authority Domain Presence
    // If top 3 results are authority domains, difficulty spikes
    const isAuthority = highAuthorityDomains.some(domain => url.includes(domain));
    if (isAuthority) {
      const positionWeight = i < 3 ? 10 : i < 6 ? 6 : 3;
      authorityScore += positionWeight;
    }

    // 4. Commercial/Intent intent (if it's a booking site, it's competitive)
    if (url.includes('booking') || url.includes('travel') || url.includes('buy')) {
      authorityScore += 2;
    }
  });

  // Calculate final KD (0-100)
  // Max theoretical authorityScore is roughly 150-180 for a "perfectly competitive" SERP
  const authorityDifficulty = (authorityScore / 160) * 60; // Max 60 points
  
  let finalKD = Math.round(baseKD + authorityDifficulty);

  // Intent Penalty: High-volume short-tail keywords get a "Short Tail Penalty"
  if (kw.split(' ').length <= 2) finalKD += 10;

  return Math.min(100, Math.max(10, finalKD));
}

// ─── 6. KD Label ──────────────────────────────────────────────────────────────

function kdLabel(kd) {
  if (kd <= 30) return { label: 'Easy', color: 'green', emoji: '🟢' };
  if (kd <= 60) return { label: 'Medium', color: 'yellow', emoji: '🟡' };
  return { label: 'Hard', color: 'red', emoji: '🔴' };
}

// ─── 7. Main Orchestrator ─────────────────────────────────────────────────────

async function analyzeKeyword(keyword) {
  console.log(`[KeywordResearch] Analyzing: "${keyword}"`);

  const [suggestions, trends, serp] = await Promise.allSettled([
    getAutocomplete(keyword),
    getTrends(keyword),
    scrapeSERP(keyword),
  ]);

  const suggestionList = suggestions.status === 'fulfilled' ? suggestions.value : [];
  const trendsData = trends.status === 'fulfilled' ? trends.value : { points: [], score: 30 };
  const serpData = serp.status === 'fulfilled' ? serp.value : { results: [], resultsCount: 0 };

  const volume = calculateVolume(trendsData.score, serpData.resultsCount);
  const kd = calculateKD(serpData.results, serpData.resultsCount, keyword);
  const opportunity = kd > 0 ? parseFloat((volume / (kd / 20)).toFixed(2)) : 0;
  const difficulty = kdLabel(kd);

  return {
    keyword,
    volume_score: volume,
    kd,
    difficulty,
    trend_score: trendsData.score,
    trend_data: trendsData.points,
    opportunity,
    related_keywords: suggestionList,
    serp: serpData.results,
    results_count: serpData.resultsCount,
    trend_fallback: trendsData.isFallback ?? false,
  };
}

module.exports = { analyzeKeyword };
