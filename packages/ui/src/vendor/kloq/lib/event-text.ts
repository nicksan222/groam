import { formatDate } from "./date-format";

export const eventTitle = (e: { title?: string | null }): string => e.title?.trim() || "Untitled";

export const plural = (n: number, noun: string): string => `${n} ${noun}${n === 1 ? "" : "s"}`;

const FULL_DATE: Intl.DateTimeFormatOptions = {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
};

type FullDateLabel = (d: Date) => string | null;

let fullDateLabel: FullDateLabel | null = null;

/**
 * Lets a host name days its own way ("Day 3") where the calendar's real date would be made up,
 * for example a trip with no dates yet. Returns a function that removes the override.
 */
export function overrideFullDate(label: FullDateLabel): () => void {
  fullDateLabel = label;
  return () => {
    if (fullDateLabel === label) fullDateLabel = null;
  };
}

/**
 * The host's own name for a day ("Day 3"), or null when it has none. Every label that would print
 * a weekday, month or date (headers, accessible names, announcements) asks this first.
 */
export const hostDayName = (d: Date): string | null => fullDateLabel?.(d) ?? null;

/** "Monday, 3 March 2026", or the host's own name for the day. */
export const fullDate = (d: Date, locale?: string): string =>
  fullDateLabel?.(d) ?? formatDate(d, locale, FULL_DATE);

/** Compact duration: 30min, 1h, 1h 30min. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}min`;
  return rest === 0 ? `${h}h` : `${h}h ${rest}min`;
}
