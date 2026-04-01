const supabase = require('./src/config/database');

async function check() {
  try {
    const { data, error } = await supabase.from('sites').select('*').limit(1);
    if (error) {
      console.error('Check Error:', error.message);
    } else {
      console.log('Columns:', Object.keys(data[0] || {}));
    }
  } catch (err) {
    console.error('Fatal Check Error:', err.message);
  }
}

check();
