require('dotenv').config();
const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const Datastore = require('nedb-promises');

function getArg(name, fallback) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((x) => x.startsWith(prefix));
  if (!arg) return fallback;
  return arg.slice(prefix.length);
}

async function resetMariaDb(username, password) {
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
    const hash = await bcrypt.hash(password, 10);
    const [rows] = await conn.query('SELECT id FROM teachers WHERE username=? AND role=? LIMIT 1', [username, 'admin']);
    if (!rows[0]) {
      const id = username;
      await conn.query(
        'INSERT INTO teachers (id, username, name, subject, role, password_hash, password_changed) VALUES (?,?,?,?,?,?,?)',
        [id, username, 'Admin', '英语', 'admin', hash, 1]
      );
      return { created: true, updated: false };
    }
    await conn.query('UPDATE teachers SET password_hash=?, password_changed=1 WHERE username=? AND role=?', [hash, username, 'admin']);
    return { created: false, updated: true };
  } finally {
    conn.release();
    await pool.end();
  }
}

async function resetLegacy(username, password) {
  const dbPath = path.join(__dirname, '../../server/data/users.db');
  const users = Datastore.create({ filename: dbPath, autoload: true });
  const hash = await bcrypt.hash(password, 10);
  const admin = await users.findOne({ username, role: 'admin' });
  if (!admin) {
    await users.insert({
      username,
      role: 'admin',
      password: hash,
      passwordChanged: true,
      createdAt: new Date()
    });
    return { created: true, updated: false };
  }
  await users.update({ _id: admin._id }, { $set: { password: hash, passwordChanged: true } });
  return { created: false, updated: true };
}

async function main() {
  const mode = getArg('mode', 'mariadb');
  const username = getArg('username', 'admin');
  const password = getArg('password', '');

  if (!password) {
    throw new Error('请提供新密码，例如 --password=NewPass123');
  }

  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('新密码至少 8 位，且包含字母和数字');
  }

  const result = mode === 'legacy'
    ? await resetLegacy(username, password)
    : await resetMariaDb(username, password);

  const action = result.created ? '已创建管理员并重置密码' : '已重置管理员密码';
  console.log(`${action}：${username}（模式：${mode}）`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

