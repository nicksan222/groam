export const displayDate = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

export function dateFromString(value: string): Date | undefined {
  const [year, month, day] = value.split('-').map(Number);
  if (!(year && month && day)) return undefined;
  return new Date(year, month - 1, day);
}

export function stringFromDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
