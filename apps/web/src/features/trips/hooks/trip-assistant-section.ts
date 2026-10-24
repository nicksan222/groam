import type { TripTabSection } from '@/features/trips/trip-sections';
import type { IdeaPlanningSection } from '@/types/ideas';

/**
 * The assistant backend has no "plan", "calendar", "polls", "research", "packing", or "people"
 * section; those read as "overview". Ideas and Issues keep the vocabulary stored on agent runs.
 */
export function assistantSection(section: IdeaPlanningSection | TripTabSection) {
  return section === 'plan' ||
    section === 'calendar' ||
    section === 'map' ||
    section === 'research' ||
    section === 'polls' ||
    section === 'packing' ||
    section === 'people'
    ? 'overview'
    : section;
}
