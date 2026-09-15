import { ConvexError } from 'convex/values';

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const LOCAL_TIME_PATTERN = /^\d{2}:\d{2}$/u;

function normalizeLocalDate(value: string | undefined, label: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!LOCAL_DATE_PATTERN.test(normalized)) {
    throw new ConvexError(`${label} must be a valid date`);
  }
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new ConvexError(`${label} must be a valid date`);
  }
  return normalized;
}

function normalizeLocalTime(value: string | undefined, label: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (!LOCAL_TIME_PATTERN.test(normalized)) {
    throw new ConvexError(`${label} must be a valid time`);
  }
  const [hours, minutes] = normalized.split(':').map(Number);
  if (hours === undefined || minutes === undefined || hours > 23 || minutes > 59) {
    throw new ConvexError(`${label} must be a valid time`);
  }
  return normalized;
}

function normalizeDayTimeRange(
  startDay: number,
  startTimeValue: string | undefined,
  endDay: number,
  endTimeValue: string | undefined,
  label: string
) {
  const startTime = normalizeLocalTime(startTimeValue, `${label} start`);
  const endTime = normalizeLocalTime(endTimeValue, `${label} end`);
  if (endTime && !startTime) {
    throw new ConvexError(`${label} start is required when an end is provided`);
  }
  if (startTime && endTime && startDay === endDay && endTime <= startTime) {
    throw new ConvexError(`${label} end must be after its start`);
  }
  return {
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {})
  };
}

/** Calendar-date and clock-time normalizers for itinerary schedules. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class LocalDateTime {
  static normalizeDate = normalizeLocalDate;
  static normalizeDayTimeRange = normalizeDayTimeRange;
}
