const tripDateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeZone: 'UTC'
});
const tripTimeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC'
});

export function formatTripDay(startDate: null | string, day: number): string {
  if (!startDate) return `Day ${day}`;
  const date = new Date(`${startDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + day - 1);
  return tripDateFormatter.format(date);
}

function formatLocalTime(value: string): string {
  return tripTimeFormatter.format(new Date(`2000-01-01T${value}:00.000Z`));
}

export function formatDayTimeRange({
  endDay,
  endTime,
  startDate,
  startDay,
  startTime
}: {
  endDay: number;
  endTime: null | string;
  startDate: null | string;
  startDay: number;
  startTime: null | string;
}): string | null {
  if (!startTime) return null;
  const start = `${formatTripDay(startDate, startDay)} at ${formatLocalTime(startTime)}`;
  if (!endTime) {
    return startDay === endDay ? start : `${start} – ${formatTripDay(startDate, endDay)}`;
  }
  const end =
    startDay === endDay
      ? formatLocalTime(endTime)
      : `${formatTripDay(startDate, endDay)} at ${formatLocalTime(endTime)}`;
  return `${start} – ${end}`;
}
