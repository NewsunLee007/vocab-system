require('dotenv').config();
const path = require('path');
const fs = require('fs');
const Datastore = require('nedb-promises');
const mysql = require('mysql2/promise');

async function main() {
  const baseDir = process.env.NEDB_DIR || path.join(__dirname, '../../server/data');
  const usersPath = path.join(baseDir, 'users.db');
  const wordlistsPath = path.join(baseDir, 'wordlists.db');

  if (!fs.existsSync(usersPath) && !fs.existsSync(wordlistsPath)) {
    throw new Error(`No NeDB files found in ${baseDir}`);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vocab_system',
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
    multipleStatements: true
  });

  const conn = await pool.getConnection();
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
    await conn.query(schemaSql);

    if (fs.existsSync(usersPath)) {
      const users = Datastore.create({ filename: usersPath, autoload: true });
      const allUsers = await users.find({});
      for (const u of allUsers) {
        if (!u || !u._id || !u.username || !u.role || !u.password) continue;
        if (u.role === 'admin' || u.role === 'teacher') {
          await conn.query(
            'INSERT INTO teachers (id, username, name, subject, role, password_hash, password_changed) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE username=VALUES(username), name=VALUES(name), subject=VALUES(subject), role=VALUES(role), password_hash=VALUES(password_hash), password_changed=VALUES(password_changed)',
            [
              u._id,
              u.username,
              u.username,
              '英语',
              u.role === 'admin' ? 'admin' : 'teacher',
              u.password,
              u.passwordChanged ? 1 : 0
            ]
          );
        } else if (u.role === 'student') {
          await conn.query(
            'INSERT INTO students (id, teacher_id, class_name, name, password_hash, password_changed, badges) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), class_name=VALUES(class_name), name=VALUES(name), password_hash=VALUES(password_hash), password_changed=VALUES(password_changed)',
            [
              u._id,
              null,
              u.className || '',
              u.username,
              u.password,
              u.passwordChanged ? 1 : 0,
              JSON.stringify([])
            ]
          );
        }
      }
    }

    if (fs.existsSync(wordlistsPath)) {
      const wordlists = Datastore.create({ filename: wordlistsPath, autoload: true });
      const allWordlists = await wordlists.find({});
      for (const wl of allWordlists) {
        if (!wl || !wl._id) continue;
        await conn.query(
          'INSERT INTO vocabulary (id, teacher_id, title, type, textbook, grade, volume, unit, words) VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE teacher_id=VALUES(teacher_id), title=VALUES(title), type=VALUES(type), textbook=VALUES(textbook), grade=VALUES(grade), volume=VALUES(volume), unit=VALUES(unit), words=VALUES(words)',
          [
            wl._id,
            wl.teacherId || null,
            wl.title || wl.name || '',
            wl.type || null,
            wl.textbook || null,
            wl.grade || null,
            wl.volume || null,
            wl.unit || null,
            JSON.stringify(wl.words || [])
          ]
        );
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

