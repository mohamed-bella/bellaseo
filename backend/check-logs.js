const supabase = require('./src/config/database');

async function checkLogs() {
  try {
    const { data, error } = await supabase.from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('Logs fetch error:', error);
      process.exit(1);
    }
    
    console.log('Latest Logs:', JSON.stringify(data, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

checkLogs();
