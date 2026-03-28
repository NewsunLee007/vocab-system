const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { config } = require('./config');
const { notFound, errorMiddleware } = require('./middleware/error');
const { pool } = require('./db/pool');

const authRoutes = require('./routes/auth');
const teachersRoutes = require('./routes/teachers');
const studentsRoutes = require('./routes/students');
const vocabularyRoutes = require('./routes/vocabulary');
const learningRecordsRoutes = require('./routes/learningRecords');
const schoolRoutes = require('./routes/school');
const syncRoutes = require('./routes/sync');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(morgan('dev'));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  const corsOptions = {
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()),
    credentials: true
  };
  app.use(cors(corsOptions));

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.get('/api/health/db', async (req, res, next) => {
    try {
      const conn = await pool.getConnection();
      try {
        await conn.query('SELECT 1 AS ok');
      } finally {
        conn.release();
      }
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/teachers', teachersRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/vocabulary', vocabularyRoutes);
  app.use('/api/learning-records', learningRecordsRoutes);
  app.use('/api/school', schoolRoutes);
  app.use('/api/sync', syncRoutes);

  app.use(notFound);
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
