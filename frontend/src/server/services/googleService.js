const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const env = require('../config/env');

/**
 * Google Service - Handles Search Console and Analytics 4 integration
 */
class GoogleService {
  constructor() {
    this.setupAuth();
  }

  setupAuth() {
    try {
      if (!env.GSC_SERVICE_ACCOUNT_JSON) {
         console.warn('[GoogleService] GSC_SERVICE_ACCOUNT_JSON is missing');
         return;
      }
      const credentials = JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON);
      this.auth = new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        [
          'https://www.googleapis.com/auth/webmasters.readonly',
          'https://www.googleapis.com/auth/analytics.readonly'
        ]
      );
      
      this.searchConsole = google.searchconsole({ version: 'v1', auth: this.auth });
      
      // GA4 Client
      this.analyticsClient = new BetaAnalyticsDataClient({
        credentials: {
          client_email: credentials.client_email,
          private_key: credentials.private_key,
        },
      });
    } catch (err) {
      console.error('[GoogleService] Auth Setup Failed:', err.message);
    }
  }

  /**
   * Fetch GSC Search Analytics
   */
  async getSearchAnalytics(siteUrl, days = 30, gscOverride = null, dimensions = ['date']) {
    try {
      let activeAuth = this.auth;
      let activeSc = this.searchConsole;

      if (gscOverride) {
        try {
          const creds = typeof gscOverride === 'string' ? JSON.parse(gscOverride) : gscOverride;
          const tempAuth = new google.auth.JWT(creds.client_email, null, creds.private_key, ['https://www.googleapis.com/auth/webmasters.readonly']);
          activeAuth = tempAuth;
          activeSc = google.searchconsole({ version: 'v1', auth: tempAuth });
        } catch (e) { console.error('[GSC Override] Invalid creds', e.message); }
      }

      if (!activeAuth) return [];

      const today = new Date();
      const startDate = new Date();
      startDate.setDate(today.getDate() - days);
      
      const response = await activeSc.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
          dimensions: dimensions,
          rowLimit: 1000
        }
      });
      
      return response.data.rows || [];
    } catch (err) {
      console.error(`[GoogleService] GSC Fetch Failed for ${siteUrl}:`, err.message);
      return [];
    }
  }

  /**
   * Fetch GA4 Basic Report
   */
  async getAnalyticsReport(propertyId, days = 30, gscOverride = null) {
    try {
      let client = this.analyticsClient;
      if (gscOverride) {
        try {
          const creds = typeof gscOverride === 'string' ? JSON.parse(gscOverride) : gscOverride;
          client = new BetaAnalyticsDataClient({
            credentials: { client_email: creds.client_email, private_key: creds.private_key }
          });
        } catch (e) { console.error('[GA4 Override] Invalid creds', e.message); }
      }

      if (!client) return [];

      const [response] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'averageSessionDuration' }
        ],
      });

      return response.rows || [];
    } catch (err) {
      console.error(`[GoogleService] GA4 Fetch Failed for ${propertyId}:`, err.message);
      return [];
    }
  }
}

module.exports = new GoogleService();
