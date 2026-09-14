import type { TripSection } from '@/types/trips';

export const tripSections = ['activity', 'ideas', 'issues', 'itinerary', 'overview'] as const;

export type { TripSection };

export const tripSectionLabels: Record<TripSection, string> = {
  activity: 'Activity',
  ideas: 'Ideas',
  issues: 'Issues',
  itinerary: 'Itinerary',
  overview: 'Overview'
};

export const tripSectionDescriptions: Record<TripSection, string> = {
  activity: 'Every planning move the group has made on this trip.',
  ideas: 'Ideas for this shared trip — send one, then apply it when the group is ready.',
  issues: 'Open issues and blockers the group still needs to settle.',
  itinerary: 'Stops, activities, and the day-by-day route.',
  overview: 'Destination, timing, and what to plan next.'
};

export function isTripSection(value: string): value is TripSection {
  return tripSections.some((section) => section === value);
}
