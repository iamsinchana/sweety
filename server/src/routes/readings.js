const express = require('express');
const { query, withTransaction } = require('../db');
const requireAuth = require('../middleware/auth');
const { todayInTz } = require('../lib/dates');
const {
  SLOT_ORDER, MAX_PER_DAY, isValidDateString, validateReading,
  duplicateSlotMessage, MAX_PER_DAY_MESSAGE,
} = require('../lib/validation');

const router = express.Router();
router.use(requireAuth);

const today = () => todayInTz(process.env.APP_TIMEZONE || 'Asia/Kolkata');
const COLUMNS = 'id, reading_date, slot, value';
const SLOT_SORT = `array_position(ARRAY[${SLOT_ORDER.map((s) => `'${s}'`).join(',')}], slot)`;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/** Checks the rules that need the database. Call inside a transaction. */
async function assertNoConflicts(client, userId, date, slot, excludeId = null) {
  // One lock per user so two simultaneous requests can't both slip past the max-4 rule.
  await client.query('SELECT pg_advisory_xact_lock($1)', [userId]);
  const { rows } = await client.query(
    'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND ($3::int IS NULL OR id <> $3)',
    [userId, date, excludeId]
  );
  if (rows.some((r) => r.slot === slot)) throw new HttpError(409, duplicateSlotMessage(slot));
  if (rows.length >= MAX_PER_DAY) throw new HttpError(409, MAX_PER_DAY_MESSAGE);
}

// GET /api/readings?date=&from=&to=&page=1&limit=20
router.get('/', async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const where = ['user_id = $1'];
  const params = [req.userId];
  const { date, from, to } = req.query;
  for (const [v, op] of [[date, '='], [from, '>='], [to, '<=']]) {
    if (v === undefined) continue;
    if (!isValidDateString(v)) return res.status(400).json({ error: 'Dates must look like YYYY-MM-DD.' });
    params.push(v);
    where.push(`reading_date ${op} $${params.length}`);
  }
  const whereSql = where.join(' AND ');
  const total = (await query(`SELECT count(*)::int AS n FROM readings WHERE ${whereSql}`, params)).rows[0].n;
  const { rows } = await query(
    `SELECT ${COLUMNS} FROM readings WHERE ${whereSql}
     ORDER BY reading_date DESC, ${SLOT_SORT} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
    params
  );
  res.json({ data: rows, page, limit, total });
});

router.get('/export', async (req, res) => {
  const { from, to } = req.query;
  if (!isValidDateString(from) || !isValidDateString(to)) {
    return res.status(400).json({ error: 'Choose a valid start and end date for the export.' });
  }
  if (from > to) {
    return res.status(400).json({ error: 'Start date must be on or before end date.' });
  }

  const { rows } = await query(
    `SELECT reading_date, slot, value FROM readings
     WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
     ORDER BY reading_date ASC, ${SLOT_SORT}`,
    [req.userId, from, to]
  );
  const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
  const csv = [
    ['Date', 'Time slot', 'Glucose (mg/dL)'],
    ...rows.map((reading) => [reading.reading_date, reading.slot, reading.value]),
  ].map((row) => row.map(csvCell).join(',')).join('\r\n');

  res.type('text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="sweety-readings-${from}-to-${to}.csv"`);
  res.send(`\uFEFF${csv}\r\n`);
});

router.post('/', async (req, res) => {
  const result = validateReading(req.body, today());
  if (result.error) return res.status(422).json({ error: result.error });
  const { reading_date, slot, value } = result.value;

  const reading = await withTransaction(async (client) => {
    await assertNoConflicts(client, req.userId, reading_date, slot);
    const { rows } = await client.query(
      `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4) RETURNING ${COLUMNS}`,
      [req.userId, reading_date, slot, value]
    );
    return rows[0];
  });
  res.status(201).json(reading);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Reading not found.' });
  const result = validateReading(req.body, today());
  if (result.error) return res.status(422).json({ error: result.error });
  const { reading_date, slot, value } = result.value;

  const reading = await withTransaction(async (client) => {
    await assertNoConflicts(client, req.userId, reading_date, slot, id);
    const { rows } = await client.query(
      `UPDATE readings SET reading_date=$1, slot=$2, value=$3 WHERE id=$4 AND user_id=$5 RETURNING ${COLUMNS}`,
      [reading_date, slot, value, id, req.userId]
    );
    if (!rows[0]) throw new HttpError(404, 'Reading not found.');
    return rows[0];
  });
  res.json(reading);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rowCount } = Number.isInteger(id)
    ? await query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [id, req.userId])
    : { rowCount: 0 };
  if (!rowCount) return res.status(404).json({ error: 'Reading not found.' });
  res.status(204).end();
});

module.exports = router;
