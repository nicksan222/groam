import type { TripRouteSearch } from '@/types/trips';

export type { TripRouteSearch };

function isDocumentId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]{20,}$/iu.test(value);
}

export function parseTripRouteSearch(search: Record<string, unknown>): TripRouteSearch {
  return {
    ...(search.addDestination === true ? { addDestination: true } : {}),
    ...(typeof search.commentTarget === 'string' ? { commentTarget: search.commentTarget } : {}),
    ...(isDocumentId(search.issue) ? { issue: search.issue } : {}),
    ...(isDocumentId(search.proposal) ? { proposal: search.proposal } : {})
  };
}
