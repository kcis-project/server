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

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/members', membersRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/admin', adminRouter);

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
