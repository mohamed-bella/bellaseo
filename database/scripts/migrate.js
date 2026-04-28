const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: 'backend/.env' });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const sql = fs.readFileSync('database/migrations/004_cron_settings.sql', 'utf8');
  await client.query(sql);
  console.log('Migration 004 applied successfully.');
  await client.end();
}
run().catch(console.error);
