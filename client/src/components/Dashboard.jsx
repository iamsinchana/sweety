import { useCallback, useEffect, useState } from 'react';
import { api, downloadReadingsCsv } from '../api.js';
import { slotLabel, todayString } from '../constants.js';
import ReadingForm from './ReadingForm.jsx';
import Reports from './Reports.jsx';

export default function Dashboard({ user, onLogout }) {
  const [date, setDate] = useState(todayString());
  const [exportRange, setExportRange] = useState(() => ({
    from: `${todayString().slice(0, 7)}-01`,
    to: todayString(),
  }));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
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

  const exportRangeError = !exportRange.from || !exportRange.to
    ? 'Choose both a start and end date.'
    : exportRange.from > exportRange.to
      ? 'Start date must be on or before end date.'
      : exportRange.to > todayString()
        ? 'End date cannot be in the future.'
        : '';

  async function exportReadings() {
    if (exportRangeError) return setExportError(exportRangeError);
    setExportError('');
    setExporting(true);
    try {
      await downloadReadingsCsv(exportRange.from, exportRange.to);
    } catch (err) {
      if (err.status === 401) return onLogout();
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

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

      <section className="panel export-panel">
        <h2>Download readings</h2>
        <p className="muted">Export your readings for a date range as a CSV file.</p>
        <div className="row">
          <label>From
            <input type="date" value={exportRange.from} max={todayString()}
              onChange={(e) => setExportRange({ ...exportRange, from: e.target.value })} />
          </label>
          <label>To
            <input type="date" value={exportRange.to} max={todayString()}
              onChange={(e) => setExportRange({ ...exportRange, to: e.target.value })} />
          </label>
        </div>
        {exportError && <p className="error" role="alert">{exportError}</p>}
        <button type="button" className="primary" disabled={exporting || !!exportRangeError} onClick={exportReadings}>
          {exporting ? 'Preparing CSV…' : 'Download CSV'}
        </button>
      </section>

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
