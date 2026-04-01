/**
 * Run migration 009 (E-E-A-T content fragments columns)
 */
require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function run() {
  console.log('Running migration 009_content_fragments...');

  const statements = [
    "ALTER TABLE articles ADD COLUMN IF NOT EXISTS research_data JSONB",
    "ALTER TABLE articles ADD COLUMN IF NOT EXISTS content_fragments JSONB",
    "ALTER TABLE articles ADD COLUMN IF NOT EXISTS schema_json JSONB",
    "ALTER TABLE articles ADD COLUMN IF NOT EXISTS refresh_history JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE articles ADD COLUMN IF NOT EXISTS indexing_submitted_at TIMESTAMP WITH TIME ZONE",
  ];

  for (const sql of statements) {
    const { error } = await supabase.rpc('run_sql', { query: sql }).catch(() => ({ error: { message: 'rpc not available' } }));
    if (error) {
      // Supabase JS client cannot run raw DDL directly — use REST API fallback
      console.warn(`Cannot run via rpc: ${error.message}`);
      console.log('Please run this SQL manually in your Supabase SQL Editor:');
      console.log('\n' + sql + ';\n');
    } else {
      console.log('✅', sql.split(' ').slice(0, 6).join(' '));
    }
  }
}

run().catch(console.error);
