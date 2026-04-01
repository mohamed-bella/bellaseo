const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Windows/Desktop/PROJECTS/v2_SEO_GEN/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkData() {
  try {
    const { data: sites } = await supabase.from('sites').select('id, name, api_url');
    console.log('SITES:');
    sites.forEach(s => console.log(`- ${s.id} | ${s.name} | ${s.api_url}`));

    const { data: campaigns } = await supabase.from('campaigns').select('id, name, target_site_id, target_cpt');
    console.log('\nCAMPAIGNS:');
    campaigns.forEach(c => console.log(`- ${c.id} | ${c.name} | Site: ${c.target_site_id} | CPT: ${c.target_cpt}`));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkData();
