const mysql = require('mysql2/promise');
const { config } = require('../config');

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  connectionLimit: config.db.connectionLimit,
  multipleStatements: config.db.multipleStatements
});

async function withConn(fn) {
  const conn = await pool.getConnection();
  const wrapped = {
    query: async (sql, params) => {
      const [rows] = await conn.query(sql, params);
      return rows;
    },
    beginTransaction: async () => conn.beginTransaction(),
    commit: async () => conn.commit(),
    rollback: async () => conn.rollback()
  };
  try {
    return await fn(wrapped);
  } finally {
    conn.release();
  }
}

module.exports = { pool, withConn };
