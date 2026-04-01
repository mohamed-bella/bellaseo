const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config({ path: 'c:/Users/Windows/Desktop/PROJECTS/v2_SEO_GEN/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function getAuthHeader(creds) {
  const token = Buffer.from(`${creds.username}:${creds.app_password}`).toString('base64');
  return { Authorization: `Basic ${token}` };
}

async function testLookup() {
  try {
    const { data: sites } = await supabase.from('sites').select('*');
    for (const site of sites) {
      console.log(`\n--- Testing Site: ${site.name} (${site.api_url}) ---`);
      const creds = JSON.parse(site.credentials_json);
      const authHeader = getAuthHeader(creds);
      
      try {
        const resp = await axios.get(`${site.api_url}/wp-json/wp/v2/types/mte_story`, { headers: authHeader, timeout: 5000 });
        console.log(`Lookup SUCCESS for mte_story:`, resp.data.rest_base, resp.data.rest_namespace);
      } catch (err) {
        console.log(`Lookup FAILED for mte_story: ${err.message}`);
        if (err.response) {
            console.log(`Response Status: ${err.response.status}`);
            console.log(`Response Data:`, JSON.stringify(err.response.data));
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

testLookup();
