import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { slotLabel, todayString } from '../constants.js';
import ReadingForm from './ReadingForm.jsx';
import Reports from './Reports.jsx';

export default function Dashboard({ user, onLogout }) {
  const [date, setDate] = useState(todayString());
  const [report, setReport] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setReport(await api(`/reports?date=${date}`));
      setError('');
    } catch (err) {
      if (err.status === 401) return onLogout(); // session expired
      setError(err.message);
    }
  }, [date, onLogout]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => setEditing(null), [date]);

  async function remove(reading) {
    if (!window.confirm(`Delete the ${slotLabel(reading.slot)} reading (${reading.value} mg/dl)?`)) return;
    try {
      await api(`/readings/${reading.id}`, { method: 'DELETE' });
      if (editing?.id === reading.id) setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="dashboard">
      <header>
        <h1 className="brand">Sweety</h1>
        <div className="who">
          <span>{user.name}</span>
          <button className="link" onClick={onLogout}>Log out</button>
        </div>
      </header>

      <label className="date-picker">Date
        <input type="date" value={date} max={todayString()} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>

      <ReadingForm
        date={date}
        editing={editing}
        takenSlots={report?.daily.readings.map((r) => r.slot) ?? []}
        onSaved={() => { setEditing(null); load(); }}
        onCancel={() => setEditing(null)}
      />

      {error && <p className="error" role="alert">{error}</p>}
      {report && <Reports report={report} onEdit={setEditing} onDelete={remove} />}
    </main>
  );
}
