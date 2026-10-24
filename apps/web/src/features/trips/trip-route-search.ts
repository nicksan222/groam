import type { TripRouteSearch } from '@/types/trips';

export type { TripRouteSearch };

function parseDay(value: unknown): number | undefined {
  const day = typeof value === 'string' ? Number(value) : value;
  return typeof day === 'number' && Number.isInteger(day) && day > 0 ? day : undefined;
}

export function parseTripRouteSearch(search: Record<string, unknown>): TripRouteSearch {
  const day = parseDay(search.day);
  return {
    ...(search.addDestination === true ? { addDestination: true } : {}),
    ...(typeof search.commentTarget === 'string' ? { commentTarget: search.commentTarget } : {}),
    ...(day ? { day } : {})
  };
}
