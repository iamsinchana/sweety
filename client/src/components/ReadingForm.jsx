import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { SLOTS, todayString } from '../constants.js';

/** Add a reading for `date`, or edit `editing` when it is set. */
export default function ReadingForm({ date, editing, takenSlots, onSaved, onCancel }) {
  const firstFree = SLOTS.find((s) => !takenSlots.includes(s.value))?.value ?? SLOTS[0].value;
  const [slot, setSlot] = useState(firstFree);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Fill the form when the user clicks "Edit", reset it when they switch back.
  useEffect(() => {
    setSlot(editing ? editing.slot : firstFree);
    setValue(editing ? String(editing.value) : '');
    setError('');
  }, [editing, date]); // eslint-disable-line react-hooks/exhaustive-deps

  function clientError() {
    if (value.trim() === '') return 'Please enter a glucose value.';
    const n = Number(value);
    if (!Number.isInteger(n) || n < 40 || n > 600) return 'Value must be between 40 and 600 mg/dl.';
    if (date > todayString()) return 'Date cannot be in the future.';
    return '';
  }

  async function submit(e) {
    e.preventDefault();
    const problem = clientError();
    if (problem) return setError(problem);
    setError('');
    setBusy(true);
    try {
      const body = { reading_date: date, slot, value: Number(value) };
      await (editing
        ? api(`/readings/${editing.id}`, { method: 'PUT', body })
        : api('/readings', { method: 'POST', body }));
      setValue('');
      onSaved();
    } catch (err) {
      setError(err.message); // server rules: duplicate slot, max 4 per day, etc.
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel reading-form" onSubmit={submit} noValidate>
      <h2>{editing ? 'Edit reading' : 'Add a reading'}</h2>
      <div className="row">
        <label>Time slot
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label>Glucose (mg/dl)
          <input inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. 110" />
        </label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row actions">
        <button className="primary" disabled={busy}>{editing ? 'Save changes' : 'Add reading'}</button>
        {editing && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
