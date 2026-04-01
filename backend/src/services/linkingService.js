const axios = require('axios');

/**
 * Linking Service - Handles internal and external link injection.
 */

/**
 * Silo-aware internal link suggestor
 */
async function getInternalLinks(site, keyword, supabase) {
  const links = [];

  // 1. Cluster Linking (Silo logic)
  if (keyword.cluster_id) {
    // Find the Pillar article for this cluster
    const { data: pillarKeyword } = await supabase
      .from('keywords')
      .select('*, articles(*)')
      .eq('cluster_id', keyword.cluster_id)
      .eq('is_pillar', true)
      .single();

    if (pillarKeyword?.articles?.[0]?.published_url) {
      links.push({
        title: pillarKeyword.articles[0].title,
        url: pillarKeyword.articles[0].published_url,
        is_pillar: true
      });
    }

    // Find other published articles in same cluster
    const { data: clusterMates } = await supabase
      .from('keywords')
      .select('*, articles(*)')
      .eq('cluster_id', keyword.cluster_id)
      .neq('id', keyword.id)
      .limit(3);

    clusterMates?.forEach(mate => {
      const art = mate.articles?.[0];
      if (art?.published_url) {
        links.push({ title: art.title, url: art.published_url });
      }
    });
  }

  // 2. Dynamic Search Fallback (if not enough cluster links)
  if (links.length < 2 && site.type === 'wordpress') {
    try {
      const { data: posts } = await axios.get(`${site.api_url}/wp-json/wp/v2/posts`, {
        params: { search: keyword.main_keyword, per_page: 3 },
        timeout: 5000
      });
      posts.forEach(p => {
        if (!links.find(l => l.url === p.link)) {
          links.push({ title: p.title.rendered, url: p.link });
        }
      });
    } catch (err) {
      console.warn('[Linking] WP fetch failed:', err.message);
    }
  }

  return links;
}

/**
 * External link provider
 */
function getExternalLinks(keywords) {
  // Common high-authority sources
  const highAuth = [
    { name: 'Wikipedia', domain: 'wikipedia.org' },
    { name: 'Forbes', domain: 'forbes.com' },
    { name: 'Healthline', domain: 'healthline.com' },
    { name: 'Search Engine Journal', domain: 'searchenginejournal.com' }
  ];

  // In a real app, we might use an API or AI to find specific relevant external links.
  // For now, return a placeholder or specific high-DA sites.
  return highAuth.slice(0, 2).map(site => ({
    title: `Learn more on ${site.name}`,
    url: `https://${site.domain}/search?q=${encodeURIComponent(keywords)}`
  }));
}

module.exports = { getInternalLinks, getExternalLinks };
