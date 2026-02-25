require('dotenv').config();
const { createApp } = require('./app');
const { config } = require('./config');
const { pool } = require('./db/pool');
const fs = require('fs');
const path = require('path');

async function initDb() {
  const schemaPath = path.join(__dirname, '../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const conn = await pool.getConnection();
  try {
    await conn.query(sql);
  } finally {
    conn.release();
  }
}

async function main() {
  await initDb();
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API server running on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

