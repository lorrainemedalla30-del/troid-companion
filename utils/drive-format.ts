/** "2026-11-20" -> "Nov 20, 2026". Falls back to the raw text if it isn't a date. */
export function formatScheduleDay(day: string | null) {
  if (!day) return 'Date not set';
  // Built from its parts: new Date("2026-11-20") would be read as UTC and can show the day before.
  const [year, month, date] = day.split('-').map(Number);
  const parsed = new Date(year, month - 1, date);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "06:00" -> "6:00 AM". Falls back to the raw text if it isn't a time. */
export function formatScheduleTime(time: string | null) {
  if (!time) return 'Time not set';
  const [hourText, minutes = '00'] = time.split(':');
  const hour = parseInt(hourText, 10);
  if (Number.isNaN(hour)) return time;
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** "Nov 20, 2026 at 6:03:12 AM" */
export function formatDriveMoment(moment: Date) {
  const date = moment.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  const time = moment.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  return `${date} at ${time}`;
}
