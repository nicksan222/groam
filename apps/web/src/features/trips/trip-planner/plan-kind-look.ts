import type { PlanKind } from '@/types/trip-planner';

/**
 * Each kind of plan keeps the calendar's hue (activities blue, places green, travel amber, stays
 * violet): a faint wash and hairline on the card, a stronger tile behind its icon, and its word.
 */
export const planKindLook = {
  activity: {
    surface: 'bg-plan-activity/8 ring-plan-activity/25',
    tile: 'bg-plan-activity/20 text-plan-activity',
    text: 'text-plan-activity'
  },
  place: {
    surface: 'bg-plan-place/8 ring-plan-place/25',
    tile: 'bg-plan-place/20 text-plan-place',
    text: 'text-plan-place'
  },
  stay: {
    surface: 'bg-plan-stay/8 ring-plan-stay/25',
    tile: 'bg-plan-stay/20 text-plan-stay',
    text: 'text-plan-stay'
  },
  travel: {
    surface: 'bg-plan-travel/8 ring-plan-travel/25',
    tile: 'bg-plan-travel/20 text-plan-travel',
    text: 'text-plan-travel'
  }
} as const satisfies Record<PlanKind, { surface: string; text: string; tile: string }>;
