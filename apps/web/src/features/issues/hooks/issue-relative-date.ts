const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export function relativeIssueDate(timestamp: number) {
  const days = Math.round((timestamp - Date.now()) / 86_400_000);
  return relativeFormatter.format(days, 'day');
}
