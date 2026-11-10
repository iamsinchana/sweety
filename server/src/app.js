require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Express 4 doesn't catch rejected promises in async handlers, so wrap them once here.
const wrapAsync = (router) => {
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const l of layer.route.stack) {
      const fn = l.handle;
      l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    }
  }
  return router;
};

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/', (_req, res) => res.json({
  name: 'Sweety API',
  status: 'ok',
  message: 'The API is running. Open the client at http://localhost:5173.',
  health: '/api/health',
}));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', wrapAsync(require('./routes/auth')));
app.use('/api/readings', wrapAsync(require('./routes/readings')));
app.use('/api/reports', wrapAsync(require('./routes/reports')));

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  if (err.code === '23505') return res.status(409).json({ error: 'You already have a reading for this slot and date.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

module.exports = app;
