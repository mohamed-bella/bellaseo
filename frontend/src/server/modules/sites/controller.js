const supabase = require('../../config/database');
const axios = require('axios');

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
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

const wordpressService = require('../../services/wordpressService');

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

module.exports = { list, get, create, update, remove, testConnection, getPostTypes, getDiagnostics, getPosts };
