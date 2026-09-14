const DAY_MS = 24 * 60 * 60 * 1000;

export function addTripDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function tripDateRangeDays(from: string, to: string) {
  if (!(from && to)) return Number.NaN;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

export function tripDurationRangeState({
  from,
  minimumDays,
  startDate,
  to,
  totalDays
}: {
  from: string;
  minimumDays: number;
  startDate: null | string;
  to: string;
  totalDays: number | null;
}) {
  const days = tripDateRangeDays(from, to);
  const isValid = Number.isInteger(days) && days >= minimumDays && days <= 365;
  return {
    days,
    hasChanged: isValid && (days !== totalDays || from !== (startDate ?? '')),
    isValid
  };
}
