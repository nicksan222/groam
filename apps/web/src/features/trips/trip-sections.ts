import type { TripSection } from '@/types/trips';

/** Every section a trip URL can name. The idea working copy only uses overview and itinerary. */
export const tripSections = [
  'board',
  'overview',
  'issues',
  'ideas',
  'activity',
  'itinerary'
] as const;

/** The tabs of a shared trip, in reading order; Board is the default. */
export const tripTabSections = ['board', 'overview', 'issues', 'ideas', 'activity'] as const;

export const defaultTripSection = 'board' satisfies TripSection;

export type { TripSection };

export const tripSectionLabels: Record<TripSection, string> = {
  activity: 'Activity',
  board: 'Board',
  ideas: 'Ideas',
  issues: 'Issues',
  itinerary: 'Itinerary',
  overview: 'Overview'
};

export function isTripSection(value: string): value is TripSection {
  return tripSections.some((section) => section === value);
}

/** Where a legacy or planning-only section lands on a shared trip's tabs. */
export function sharedTripSection(section: TripSection): TripSection {
  return section === 'itinerary' ? 'overview' : section;
}

export function tripSectionTitle(section: TripSection): string {
  return tripSectionLabels[section];
}
