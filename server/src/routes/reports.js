const express = require('express');
const { query } = require('../db');
const requireAuth = require('../middleware/auth');
const { todayInTz, reportRanges } = require('../lib/dates');
const { computeStats } = require('../lib/stats');
const { SLOT_ORDER, isValidDateString } = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

const valuesBetween = async (userId, { from, to }) => {
  const { rows } = await query(
    'SELECT value FROM readings WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3',
    [userId, from, to]
  );
  return rows.map((r) => r.value);
};

// GET /api/reports?date=YYYY-MM-DD  (defaults to today)
router.get('/', async (req, res) => {
  const today = todayInTz(process.env.APP_TIMEZONE || 'Asia/Kolkata');
  const date = req.query.date ?? today;
  if (!isValidDateString(date)) return res.status(400).json({ error: 'Date must look like YYYY-MM-DD.' });
  if (date > today) return res.status(422).json({ error: 'Date cannot be in the future.' });

  const ranges = reportRanges(date);
  const [dailyRows, mtdValues, prevValues] = await Promise.all([
    query('SELECT id, reading_date, slot, value FROM readings WHERE user_id = $1 AND reading_date = $2', [req.userId, date]),
    valuesBetween(req.userId, ranges.monthToDate),
    valuesBetween(req.userId, ranges.previousMonth),
  ]);
  const readings = dailyRows.rows.sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));

  res.json({
    date,
    daily: { range: ranges.daily, stats: computeStats(readings.map((r) => r.value)), readings },
    monthToDate: { range: ranges.monthToDate, stats: computeStats(mtdValues) },
    previousMonth: { range: ranges.previousMonth, stats: computeStats(prevValues) },
  });
});

module.exports = router;
