export const SLOTS = [
  { value: 'morning', label: 'Morning (fasting)' },
  { value: 'after_breakfast', label: 'After breakfast' },
  { value: 'after_lunch', label: 'After lunch' },
  { value: 'after_dinner', label: 'After dinner' },
];
export const slotLabel = (v) => SLOTS.find((s) => s.value === v)?.label ?? v;

// Local calendar date as YYYY-MM-DD (not UTC, so late-evening users get the right day).
export const todayString = () => new Date().toLocaleDateString('en-CA');

export function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
  });
}
export const formatRange = ({ from, to }) => (from === to ? formatDate(from) : `${formatDate(from)} – ${formatDate(to)}`);
