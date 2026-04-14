const googleService = require('../../services/googleService');
const supabase = require('../../config/database');
const env = require('../../config/env');

/**
 * Analytics Controller - Provides GSC and GA4 data points
 */

const getOverview = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    const propId = env.GA4_PROPERTY_ID;

    // 1. Resolve which site URLs to fetch GSC data for
    let targetSites = [];
    if (siteId) {
      const { data } = await supabase.from('sites').select('api_url, gsc_service_account, ga4_property_id').eq('id', siteId).single();
      if (data) targetSites.push(data);
    } else {
      const { data: allSites } = await supabase.from('sites').select('api_url, gsc_service_account, ga4_property_id');
      targetSites = allSites || [];
    }

    // 2. Parallel Fetch
    // We pick the GA4 prop ID from the selected site (or the first site that has one, falling back to global)
    const activeGa4Site = targetSites.find(s => s.ga4_property_id) || { ga4_property_id: propId };

    const [gscResults, ga4, topPagesResults] = await Promise.all([
       Promise.all(targetSites.map(s => 
         googleService.getSearchAnalytics(s.api_url, 30, s.gsc_service_account)
       )),
       activeGa4Site.ga4_property_id ? googleService.getAnalyticsReport(activeGa4Site.ga4_property_id, 30, activeGa4Site.gsc_service_account) : null,
       Promise.all(targetSites.map(s => 
         googleService.getSearchAnalytics(s.api_url, 30, s.gsc_service_account, ['page'])
       ))
    ]);

    // 3. Aggregate GSC results if multiple (Global Overview)
    const flattened = gscResults.flat();
    const aggregated = flattened.reduce((acc, row) => {
      const date = row.keys[0];
      if (!acc[date]) {
        acc[date] = { keys: [date], clicks: 0, impressions: 0, position: 0, count: 0 };
      }
      acc[date].clicks += row.clicks || 0;
      acc[date].impressions += row.impressions || 0;
      acc[date].position += row.position || 0;
      acc[date].count += 1;
      return acc;
    }, {});

    const finalGsc = Object.values(aggregated).map((row) => ({
      ...row,
      position: row.position / (row.count || 1) // Average of averages
    })).sort((a, b) => a.keys[0].localeCompare(b.keys[0])); // ASC for chart

    // 3b. Aggregate top pages
    const topPagesFlat = topPagesResults.flat();
    const topPagesAgg = topPagesFlat.reduce((acc, row) => {
      const page = row.keys[0];
      if (!acc[page]) acc[page] = { path: page, clicks: 0, impressions: 0 };
      acc[page].clicks += row.clicks || 0;
      acc[page].impressions += row.impressions || 0;
      return acc;
    }, {});
    const topPages = Object.values(topPagesAgg).sort((a, b) => b.clicks - a.clicks).slice(0, 50);
    
    // 4. Localize/Flatten GA4 Metrics
    const finalGa4 = (ga4 || []).map(row => ({
      date: row.dimensionValues[0].value,
      activeUsers: Number(row.metricValues[0].value || 0),
      sessions: Number(row.metricValues[1].value || 0),
      views: Number(row.metricValues[2].value || 0),
      duration: Number(row.metricValues[3].value || 0),
    })).sort((a, b) => a.date.localeCompare(b.date));

    const activeGa4Prop = activeGa4Site.ga4_property_id;
    const hasGscCreds = !!env.GSC_SERVICE_ACCOUNT_JSON || targetSites.some(s => s.gsc_service_account);

    res.json({
      gsc: finalGsc || [],
      ga4: finalGa4 || [],
      topPages: topPages || [],
      connections: {
        gsc: !!hasGscCreds && Array.isArray(flattened) && flattened.length > 0,
        ga4: !!activeGa4Prop && Array.isArray(finalGa4) && finalGa4.length > 0,
      }
    });
  } catch (err) { next(err); }
};
const testConnection = async (req, res, next) => {
  try {
    const { siteId } = req.query;
    let site = null;
    if (siteId) {
      const { data } = await supabase.from('sites').select('api_url, gsc_service_account').eq('id', siteId).single();
      site = data;
    }

    const url = site?.api_url || 'https://google.com'; 
    const creds = site?.gsc_service_account || env.GSC_SERVICE_ACCOUNT_JSON;

    if (!creds) return res.json({ connected: false, message: 'No credentials configured' });

    const results = await googleService.getSearchAnalytics(url, 1, creds);
    res.json({ 
      connected: true, 
      message: 'Successfully connected to Google APIs'
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
};

module.exports = { getOverview, testConnection };
