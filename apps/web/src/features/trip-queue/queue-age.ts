const minute = 60_000;
const hour = 60 * minute;
const day = 24 * hour;

/** How long ago, in the fewest characters: "now", "5m", "3h", "2d", "1w", "4mo", "2y". */
export function compactAge(timestamp: number, now = Date.now()) {
  const elapsed = Math.max(0, now - timestamp);
  if (elapsed < minute) return 'now';
  if (elapsed < hour) return `${Math.floor(elapsed / minute)}m`;
  if (elapsed < day) return `${Math.floor(elapsed / hour)}h`;
  if (elapsed < 7 * day) return `${Math.floor(elapsed / day)}d`;
  if (elapsed < 60 * day) return `${Math.floor(elapsed / (7 * day))}w`;
  if (elapsed < 365 * day) return `${Math.floor(elapsed / (30 * day))}mo`;
  return `${Math.floor(elapsed / (365 * day))}y`;
}
