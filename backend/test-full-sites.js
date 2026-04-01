const supabase = require('./src/config/database');

async function testFullSites() {
  try {
    const { data, error } = await supabase.from('sites').select('*');
    if (error) {
      console.error('Supabase error:', error);
      process.exit(1);
    }
    console.log('Sites:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

testFullSites();
