const supabase = require('../../config/database');
const axios = require('axios');
const bloggerService = require('../../services/bloggerService');
const wordpressService = require('../../services/wordpressService');

const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('sites')
      .select('id, name, type, api_url, ga4_property_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      const fs = require('fs');
      const log = `[${new Date().toISOString()}] Sites List Error: ${JSON.stringify(error)}\n`;
      fs.appendFileSync('sites_error.log', log);
      throw error;
    }
    res.json(data);
  } catch (err) { 
    const fs = require('fs');
    const log = `[${new Date().toISOString()}] Sites Catch Error: ${err.message}\nStack: ${err.stack}\n`;
    fs.appendFileSync('sites_error.log', log);
    next(err); 
  }
};

const get = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('sites')
      .select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Site not found' });
    
    // Parse credentials for the edit form
    if (data.credentials_json) {
      try { data.credentials = JSON.parse(data.credentials_json); } catch(e) { data.credentials = {}; }
      delete data.credentials_json;
    }
    
    res.json(data);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, type, api_url, credentials, gsc_service_account, ga4_property_id } = req.body;
    if (!name || !type || !api_url || !credentials) {
      return res.status(400).json({ error: 'name, type, api_url, and credentials are required' });
    }
    const credentials_json = JSON.stringify(credentials);
    const { data, error } = await supabase.from('sites')
      .insert({ 
        name, type, api_url, credentials_json, 
        gsc_service_account, ga4_property_id 
      }).select('id, name, type, api_url, created_at').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const { credentials, ...rest } = req.body;
    const updates = { ...rest, updated_at: new Date().toISOString() };
    if (credentials) {
      updates.credentials_json = JSON.stringify(credentials);
    }
    
    const { data, error } = await supabase.from('sites')
      .update(updates).eq('id', req.params.id)
      .select('id, name, type, api_url, ga4_property_id').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const { error } = await supabase.from('sites').delete().eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (err) { next(err); }
};

const testConnection = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;

    const creds = JSON.parse(site.credentials_json);

    if (site.type === 'blogger') {
      const info = await bloggerService.getBlogInfo(site);
      return res.json({
        success:     true,
        blog_name:   info.name,
        blog_url:    info.url,
        posts_total: info.posts_total,
        description: info.description,
      });
    }

    if (site.type === 'wordpress') {
      const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
      const authHeader = { Authorization: `Basic ${token}` };

      // 1. Check Authentication
      const resp = await axios.get(`${site.api_url}/wp-json/wp/v2/users/me`, {
        headers: authHeader,
        timeout: 8000,
      });

      // 2. Check Permissions (Check if user can view posts in 'edit' context)
      try {
        await axios.get(`${site.api_url}/wp-json/wp/v2/posts`, {
          params: { context: 'edit', per_page: 1 },
          headers: authHeader,
          timeout: 5000,
        });
      } catch (permErr) {
        if (permErr.response?.status === 401 || permErr.response?.status === 403) {
          return res.json({
            success: false,
            error: `Authenticated as ${resp.data.name}, but lacks post creation permissions. Root cause: User role is likely 'Subscriber'. Upgrade to 'Author' or higher.`
          });
        }
      }

      return res.json({ success: true, user: resp.data.name, role: resp.data.roles?.join(', ') });
    }

    return res.status(400).json({ success: false, error: `Unsupported site type: ${site.type}` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

const publishTestPost = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!site) return res.status(404).json({ error: 'Site not found' });

    if (site.type === 'blogger') {
      const result = await bloggerService.publishTestPost(site);
      return res.json({ success: true, blogger_id: result.blogger_id, url: result.url });
    }

    if (site.type !== 'wordpress') {
      return res.status(400).json({ error: `Test posting not supported for site type: ${site.type}` });
    }

    const creds = JSON.parse(site.credentials_json);
    const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
    const authHeader = {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; BellaSEO/2.0)',
    };

    const now = new Date();
    const testPayload = {
      title: `[TEST] Connection Probe — ${now.toUTCString()}`,
      content: `<p>This is an automated connection test post created by <strong>BellaSEO</strong> on ${now.toUTCString()}.</p><p>If you can see this post, publishing is working correctly. Please delete it.</p>`,
      slug: `bellaseo-test-${Date.now()}`,
      status: 'private',
      meta: {},
    };

    const postResp = await axios.post(
      `${site.api_url}/wp-json/wp/v2/posts`,
      testPayload,
      { headers: authHeader, timeout: 20000 }
    );

    const wpId = postResp.data.id;
    // Build a preview link that works even for private posts
    const previewLink = postResp.data.link || `${site.api_url}/?p=${wpId}`;

    return res.json({ success: true, wp_id: wpId, url: previewLink });
  } catch (err) {
    const body = err.response?.data;
    let msg = body?.message || err.message;
    if (body?.code === 'rest_cannot_create') {
      msg = "Permission denied: your user role cannot create posts. Upgrade to Author/Editor/Administrator.";
    } else if (err.response?.status === 401) {
      msg = "Authentication failed: wrong username or Application Password.";
    } else if (err.response?.status === 403) {
      msg = "Forbidden: a security plugin (Wordfence, iThemes, etc.) is blocking the REST API.";
    }
    return res.status(400).json({ success: false, error: msg });
  }
};

const deleteTestPost = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!site) return res.status(404).json({ error: 'Site not found' });

    const { wp_id, blogger_id } = req.body;

    if (site.type === 'blogger') {
      if (!blogger_id) return res.status(400).json({ error: 'blogger_id is required' });
      await bloggerService.deletePost(site, blogger_id);
      return res.json({ success: true });
    }

    if (!wp_id) return res.status(400).json({ error: 'wp_id is required' });

    const creds = JSON.parse(site.credentials_json);
    const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
    const authHeader = {
      Authorization: `Basic ${token}`,
      'User-Agent': 'Mozilla/5.0 (compatible; BellaSEO/2.0)',
    };

    // force=true skips trash and permanently deletes
    await axios.delete(
      `${site.api_url}/wp-json/wp/v2/posts/${wp_id}?force=true`,
      { headers: authHeader, timeout: 10000 }
    );

    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, error: err.response?.data?.message || err.message });
  }
};

const getPostTypes = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!site) return res.status(404).json({ error: 'Site not found' });
    
    if (site.type !== 'wordpress') {
      return res.json([{ slug: 'post', name: 'Posts' }]);
    }

    site.credentials = JSON.parse(site.credentials_json);
    const types = await wordpressService.getPostTypes(site);
    res.json(types);
  } catch (err) {
    next(err);
  }
};

const getDiagnostics = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!site) return res.status(404).json({ error: 'Site not found' });

    if (site.type !== 'wordpress') {
      return res.status(400).json({ error: 'Diagnostics only supported for WordPress sites' });
    }

    const diagnostics = await wordpressService.getSiteDiagnostics(site);
    res.json(diagnostics);
  } catch (err) {
    next(err);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { data: site, error } = await supabase.from('sites').select('*').eq('id', req.params.id).single();
    if (error) throw error;
    if (!site) return res.status(404).json({ error: 'Site not found' });

    if (site.type !== 'wordpress') {
      return res.status(400).json({ error: 'Fetching posts only supported for WordPress sites' });
    }

    const { type = 'post', limit = 10 } = req.query;
    const posts = await wordpressService.getPostsByType(site, type, parseInt(limit));
    res.json(posts);
  } catch (err) {
    next(err);
  }
};

module.exports = { list, get, create, update, remove, testConnection, getPostTypes, getDiagnostics, getPosts, publishTestPost, deleteTestPost };
