require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const casesRoutes = require('./routes/cases');
const agenciesRoutes = require('./routes/agencies');
const usersRoutes = require('./routes/users');
const logsRoutes = require('./routes/logs');

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/logs', logsRoutes);

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
