const supabase = require('./src/config/database');

async function test() {
  try {
    const { data, error } = await supabase.from('sites')
      .select('id, name, type, api_url, ga4_property_id, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase Error:', error);
      process.exit(1);
    }
    
    console.log('Success! Count:', data.length);
    console.log('First Item Keys:', Object.keys(data[0] || {}));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected Error:', err);
    process.exit(1);
  }
}

test();
