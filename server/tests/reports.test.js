const test = require('node:test');
const assert = require('node:assert/strict');
const { reportRanges, todayInTz } = require('../src/lib/dates');
const { computeStats } = require('../src/lib/stats');

test('report ranges for 15 Oct 2026 match the assignment', () => {
  assert.deepEqual(reportRanges('2026-10-15'), {
    daily: { from: '2026-10-15', to: '2026-10-15' },
    monthToDate: { from: '2026-10-01', to: '2026-10-15' },
    previousMonth: { from: '2026-09-01', to: '2026-09-30' },
  });
});

test('previous month handles January and leap-year February', () => {
  assert.deepEqual(reportRanges('2026-01-10').previousMonth, { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(reportRanges('2024-03-05').previousMonth, { from: '2024-02-01', to: '2024-02-29' });
});

test('month-to-date on the 1st is a single day', () => {
  assert.deepEqual(reportRanges('2026-10-01').monthToDate, { from: '2026-10-01', to: '2026-10-01' });
});

test('stats: highest, lowest, average rounded to 1 decimal, count', () => {
  assert.deepEqual(computeStats([100, 110, 121]), { count: 3, highest: 121, lowest: 100, average: 110.3 });
});

test('stats: empty list gives nulls and zero count', () => {
  assert.deepEqual(computeStats([]), { count: 0, highest: null, lowest: null, average: null });
});

test('todayInTz respects the timezone', () => {
  const instant = new Date('2026-10-14T20:00:00Z'); // already 15 Oct in India
  assert.equal(todayInTz('Asia/Kolkata', instant), '2026-10-15');
  assert.equal(todayInTz('UTC', instant), '2026-10-14');
});
