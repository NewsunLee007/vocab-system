const request = require('supertest');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const { createApp } = require('../src/app');
const { pool } = require('../src/db/pool');

const shouldRun = String(process.env.RUN_INTEGRATION_TESTS || '').toLowerCase() === 'true';

const describeIf = shouldRun ? describe : describe.skip;

describeIf('API integration', () => {
  let app;
  let agent;

  beforeAll(async () => {
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    const conn = await pool.getConnection();
    try {
      await conn.query(sql);
      const adminHash = await bcrypt.hash('root', 10);
      await conn.query(
        'INSERT INTO teachers (id, username, name, role, subject, password_hash, password_changed) VALUES (?,?,?,?,?,?,0) ON DUPLICATE KEY UPDATE role=VALUES(role), password_hash=VALUES(password_hash)',
        ['admin', 'admin', 'Admin', 'admin', '英语', adminHash]
      );
    } finally {
      conn.release();
    }

    app = createApp();
    agent = request.agent(app);
  });

  afterAll(async () => {
    await pool.end();
  });

  test('admin login -> create teacher -> list teachers', async () => {
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ role: 'admin', username: 'admin', password: 'root' })
      .expect(200);
    expect(loginRes.body.success).toBe(true);

    await agent
      .post('/api/teachers')
      .send({ id: 't001', username: 't001', name: 'Teacher 1', role: 'teacher', password: '123456' })
      .expect(200);

    const listRes = await agent.get('/api/teachers').expect(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data)).toBe(true);
  });
});

