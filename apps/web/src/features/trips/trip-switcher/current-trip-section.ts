import { tripTabSections } from '@/features/trips/trip-sections';
import type { TripTabSection } from '@/types/trips';

/** The shared-trip tab the route is on, or null off a trip. An idea's pages count as Ideas, an issue's as Issues and a research thread's as Research. */
export function currentTripSection(params: {
  issueId?: string;
  proposalId?: string;
  researchId?: string;
  section?: string;
}): TripTabSection | null {
  if (params.proposalId) return 'ideas';
  if (params.issueId) return 'issues';
  if (params.researchId) return 'research';
  return tripTabSections.find((tab) => tab === params.section) ?? null;
}
