/** Sadhana days roll over at 4:30 AM local time, not midnight. */
export function getSadhanaDate(date = new Date()) {
  const offsetMs = (4 * 60 + 30) * 60 * 1000;
  const adjusted = new Date(date.getTime() - offsetMs);
  const y = adjusted.getFullYear();
  const m = adjusted.getMonth() + 1;
  const d = adjusted.getDate();
  return formatDateParts(y, m, d);
}

export function formatDateParts(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Calendar-safe day arithmetic — avoids DST / timezone loops from toISOString(). */
export function addDays(dateStr, delta) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export function enumerateDates(startDate, endDate) {
  if (!startDate || !endDate || startDate > endDate) return [];

  const dates = [];
  let current = startDate;
  let guard = 0;

  while (current <= endDate) {
    dates.push(current);
    const next = addDays(current, 1);
    if (next === current || ++guard > 5000) break;
    current = next;
  }

  return dates;
}

export function getRecentDates(count, endDate = getSadhanaDate()) {
  const dates = [];
  for (let i = count - 1; i >= 0; i--) {
    dates.push(addDays(endDate, -i));
  }
  return dates;
}

export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export function getMonthBounds(year, month) {
  const daysInMonth = getDaysInMonth(year, month);
  const mm = String(month).padStart(2, '0');
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  };
}
