/** Today's date (YYYY-MM-DD) in the given IANA timezone. */
function todayInTz(tz, now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: tz }); // en-CA gives YYYY-MM-DD
}

const iso = (d) => d.toISOString().slice(0, 10);

/** The three report ranges for a selected date (all inclusive). */
function reportRanges(selected) {
  const [y, m] = selected.split('-').map(Number); // m is 1-12
  return {
    daily: { from: selected, to: selected },
    monthToDate: { from: iso(new Date(Date.UTC(y, m - 1, 1))), to: selected },
    previousMonth: {
      from: iso(new Date(Date.UTC(y, m - 2, 1))),
      to: iso(new Date(Date.UTC(y, m - 1, 0))), // day 0 = last day of previous month
    },
  };
}

module.exports = { todayInTz, reportRanges };
