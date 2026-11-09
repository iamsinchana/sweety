const SLOTS = {
  morning: 'Morning (fasting)',
  after_breakfast: 'After breakfast',
  after_lunch: 'After lunch',
  after_dinner: 'After dinner',
};
const SLOT_ORDER = Object.keys(SLOTS);
const MIN_VALUE = 40;
const MAX_VALUE = 600;
const MAX_PER_DAY = 4;

function isValidDateString(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

const articleFor = (slot) => (slot === 'morning' ? 'a' : 'an');
const duplicateSlotMessage = (slot) =>
  `You already have ${articleFor(slot)} ${SLOTS[slot]} reading for this date.`;
const MAX_PER_DAY_MESSAGE = `You can add only ${MAX_PER_DAY} readings per day.`;

/**
 * Validates the parts of a reading that don't need the database.
 * `today` is a YYYY-MM-DD string (so the function stays easy to test).
 * Returns { error } or { value: { reading_date, slot, value } }.
 */
function validateReading(body, today) {
  const { reading_date, slot, value } = body || {};

  if (value === undefined || value === null || String(value).trim() === '') {
    return { error: 'Please enter a glucose value.' };
  }
  const num = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(num) || num < MIN_VALUE || num > MAX_VALUE) {
    return { error: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.` };
  }
  if (!SLOT_ORDER.includes(slot)) {
    return { error: 'Please choose a time slot.' };
  }
  if (!isValidDateString(reading_date)) {
    return { error: 'Please choose a valid date.' };
  }
  if (reading_date > today) {
    return { error: 'Date cannot be in the future.' };
  }
  return { value: { reading_date, slot, value: num } };
}

module.exports = {
  SLOTS, SLOT_ORDER, MIN_VALUE, MAX_VALUE, MAX_PER_DAY,
  isValidDateString, validateReading, duplicateSlotMessage, MAX_PER_DAY_MESSAGE,
};
