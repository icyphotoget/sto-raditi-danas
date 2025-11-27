// db.js
//
// Spajanje na Supabase Postgres bazu preko DATABASE_URL iz .env

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('GREŠKA: DATABASE_URL nije postavljen u .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // treba za Supabase (SSL)
  },
});

// Helper za upite
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('SQL', { text, duration: `${duration}ms`, rows: res.rowCount });
  return res;
}

module.exports = {
  pool,
  query,
};
