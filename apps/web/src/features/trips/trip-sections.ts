import {
  CalendarDays,
  Compass,
  History,
  type Icon,
  Lightbulb,
  CircleDot,
  Luggage,
  Map as MapIcon,
  Route,
  Users,
  Vote
} from '@groam/icons';
import { ideaPackingCta, ideaPlanCta } from '@/features/ideas/idea-glossary';
import type { SectionAction, TripTabSection } from '@/types/trips';

/** The sections of a shared trip, in reading order; Plan is the landing. */
export const tripTabSections = [
  'plan',
  'calendar',
  'map',
  'ideas',
  'issues',
  'polls',
  'packing',
  'research',
  'activity',
  'people'
] as const;

export const defaultTripSection = 'plan' satisfies TripTabSection;

export type { TripTabSection };

/** Everything the sidebar, the page header, and the page body need to know about a section. */
export const tripSectionConfig: Record<
  TripTabSection,
  {
    icon: Icon;
    label: string;
    /** `fill` pages scroll inside themselves; `padded` pages sit in the padded page body. */
    layout: 'fill' | 'padded';
    /** What the header offers to start: the section's one creation button, if it has one. Every other creation lives in the Trip actions menu. */
    primaryAction?: SectionAction;
    /** Names the one-idea primary button when the section phrases it its own way. */
    primaryActionLabel?: string;
  }
> = {
  activity: {
    icon: History,
    label: 'Activity',
    layout: 'padded'
  },
  calendar: {
    icon: CalendarDays,
    label: 'Calendar',
    layout: 'fill',
    primaryAction: 'idea',
    primaryActionLabel: ideaPlanCta
  },
  ideas: {
    icon: Lightbulb,
    label: 'Ideas',
    layout: 'padded',
    primaryAction: 'idea'
  },
  issues: {
    icon: CircleDot,
    label: 'Issues',
    layout: 'padded',
    primaryAction: 'issue'
  },
  map: {
    icon: MapIcon,
    label: 'Map',
    layout: 'fill',
    primaryAction: 'idea',
    primaryActionLabel: ideaPlanCta
  },
  packing: {
    icon: Luggage,
    label: 'Packing',
    layout: 'padded',
    primaryAction: 'idea',
    primaryActionLabel: ideaPackingCta
  },
  people: {
    icon: Users,
    label: 'People',
    layout: 'padded',
    primaryAction: 'invite'
  },
  plan: {
    icon: Route,
    label: 'Plan',
    layout: 'padded',
    primaryAction: 'idea',
    primaryActionLabel: ideaPlanCta
  },
  polls: {
    icon: Vote,
    label: 'Polls',
    layout: 'padded',
    primaryAction: 'poll'
  },
  research: {
    icon: Compass,
    label: 'Research',
    layout: 'padded',
    primaryAction: 'research'
  }
};

export function isTripSection(value: string): value is TripTabSection {
  return tripTabSections.some((section) => section === value);
}

export function tripSectionTitle(section: TripTabSection): string {
  return tripSectionConfig[section].label;
}
