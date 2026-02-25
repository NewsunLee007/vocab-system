const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  cookieName: process.env.COOKIE_NAME || 'auth_token',
  cookieSecure: String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true',
  cookieSameSite: process.env.COOKIE_SAMESITE || 'Lax',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'vocab_system',
    connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
    multipleStatements: true
  }
};

module.exports = { config };
