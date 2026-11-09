const test = require('node:test');
const assert = require('node:assert/strict');
const { validateReading, duplicateSlotMessage, isValidDateString } = require('../src/lib/validation');

const TODAY = '2026-10-15';
const ok = { reading_date: '2026-10-15', slot: 'after_lunch', value: 120 };

test('accepts a valid reading', () => {
  assert.deepEqual(validateReading(ok, TODAY), { value: ok });
});

test('accepts numeric strings and the 40 / 600 limits', () => {
  assert.equal(validateReading({ ...ok, value: '40' }, TODAY).value.value, 40);
  assert.equal(validateReading({ ...ok, value: 600 }, TODAY).value.value, 600);
});

test('value is required', () => {
  for (const value of [undefined, null, '', '  ']) {
    assert.equal(validateReading({ ...ok, value }, TODAY).error, 'Please enter a glucose value.');
  }
});

test('value must be a whole number between 40 and 600', () => {
  const msg = 'Value must be between 40 and 600 mg/dl.';
  for (const value of [39, 601, 99.5, 'abc', -5]) {
    assert.equal(validateReading({ ...ok, value }, TODAY).error, msg, `value ${value}`);
  }
});

test('date cannot be in the future', () => {
  assert.equal(validateReading({ ...ok, reading_date: '2026-10-16' }, TODAY).error, 'Date cannot be in the future.');
  assert.ok(validateReading({ ...ok, reading_date: '2026-10-14' }, TODAY).value);
});

test('rejects unknown slots and malformed dates', () => {
  assert.ok(validateReading({ ...ok, slot: 'midnight' }, TODAY).error);
  assert.ok(validateReading({ ...ok, reading_date: '2026-02-30' }, TODAY).error);
  assert.equal(isValidDateString('15/10/2026'), false);
});

test('duplicate slot message names the slot', () => {
  assert.equal(duplicateSlotMessage('after_lunch'), 'You already have an After lunch reading for this date.');
});
