import { formatRange, slotLabel } from '../constants.js';

function Stats({ title, report, emptyText }) {
  const { stats, range } = report;
  return (
    <section className="panel">
      <h3>{title}</h3>
      <p className="muted range">{formatRange(range)}</p>
      {stats.count === 0 ? (
        <p className="empty">{emptyText}</p>
      ) : (
        <dl className="stats">
          <div><dt>Highest</dt><dd>{stats.highest}</dd></div>
          <div><dt>Lowest</dt><dd>{stats.lowest}</dd></div>
          <div><dt>Average</dt><dd>{stats.average.toFixed(1)}</dd></div>
          <div><dt>Readings</dt><dd>{stats.count}</dd></div>
        </dl>
      )}
    </section>
  );
}

export default function Reports({ report, onEdit, onDelete }) {
  return (
    <div className="reports">
      <Stats title="Daily" report={report.daily} emptyText="No readings for this day yet. Add one above." />
      <section className="panel">
        <h3>Readings on this day</h3>
        {report.daily.readings.length === 0 ? (
          <p className="empty">Nothing logged yet.</p>
        ) : (
          <table>
            <thead><tr><th>Time slot</th><th>mg/dl</th><th /></tr></thead>
            <tbody>
              {report.daily.readings.map((r) => (
                <tr key={r.id}>
                  <td>{slotLabel(r.slot)}</td>
                  <td className="num">{r.value}</td>
                  <td className="actions">
                    <button className="link" onClick={() => onEdit(r)}>Edit</button>
                    <button className="link danger" onClick={() => onDelete(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <Stats title="Month to date" report={report.monthToDate} emptyText="No readings so far this month." />
      <Stats title="Previous month" report={report.previousMonth} emptyText="No readings in the previous month." />
    </div>
  );
}
