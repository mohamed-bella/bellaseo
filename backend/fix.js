const supabase = require('./src/config/database');
const bcrypt = require('bcryptjs');

async function fixAdmin() {
  const password = 'admin123';
  const hash = bcrypt.hashSync(password, 10);
  console.log('Real hash:', hash);
  const { data, error } = await supabase.from('users').update({ password_hash: hash }).eq('username', 'admin');
  if (error) console.error('Error updating:', error);
  else console.log('Successfully updated the admin password in the database to fix the PowerShell typo.');
}

fixAdmin();
