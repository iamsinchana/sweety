const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { todayInTz } = require('./lib/dates');
const { SLOT_ORDER } = require('./lib/validation');

const EMAIL = 'demo@sweety.test';
const PASSWORD = 'Demo@1234';
const DAYS = 75; // enough to fill this month and the previous month

// Typical-looking values per slot: [base, spread]
const PROFILE = { morning: [105, 25], after_breakfast: [150, 40], after_lunch: [145, 40], after_dinner: [140, 35] };
const rand = (base, spread) => Math.round(base + (Math.random() * 2 - 1) * spread);

(async () => {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ('Demo Patient', $1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash RETURNING id`,
    [EMAIL, hash]
  );
  const userId = rows[0].id;
  await pool.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const today = new Date(`${todayInTz(process.env.APP_TIMEZONE || 'Asia/Kolkata')}T00:00:00Z`);
  let count = 0;
  for (let i = 0; i < DAYS; i++) {
    const date = new Date(today - i * 86400000).toISOString().slice(0, 10);
    // Mostly 3-4 readings a day, occasionally fewer, so reports look realistic.
    const slots = SLOT_ORDER.filter(() => Math.random() > (i % 7 === 0 ? 0.5 : 0.15));
    for (const slot of slots) {
      await pool.query('INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4)', [userId, date, slot, rand(...PROFILE[slot])]);
      count++;
    }
  }
  console.log(`Seeded ${count} readings. Log in with ${EMAIL} / ${PASSWORD}`);
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
