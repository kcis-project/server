require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const membersRouter = require('./routes/members');
const companiesRouter = require('./routes/companies');
const departmentsRouter = require('./routes/departments');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '256kb' }));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/members', membersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/admin', adminRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal error' });
});

async function start() {
  await db.init();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await db.close();
  process.exit(0);
});
