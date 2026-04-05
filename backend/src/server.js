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
    
    // Migration: Add plain_password to students table if it doesn't exist
    try {
      await conn.query("ALTER TABLE students ADD COLUMN plain_password VARCHAR(255) NULL DEFAULT '123456'");
      console.log("Migration: Added plain_password column to students table.");
    } catch (e) {
      // Ignore error if column already exists (ER_DUP_FIELDNAME)
      if (e.code !== 'ER_DUP_FIELDNAME') {
        console.warn("Migration warning for plain_password:", e.message);
      }
    }
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

