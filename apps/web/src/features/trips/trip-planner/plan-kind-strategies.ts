import { BedDouble, DoorOpen, LogOut, MapPin } from '@groam/icons';
import { formatTransferDuration, transportModeFor } from '@/features/trips/trip-transfer-options';
import type { PlanCardModel, PlanEntryStrategy, PlannerEntry } from '@/types/trip-planner';
import type { Destination, Stay } from '@/types/trips';
import { activityIcon } from './plan-activity-icon';
import { planFacts } from './plan-facts';

/** "Day 1 → Day 3 · ends 09:30" when a plan runs past its first day; nothing otherwise. */
function spanMeta(entry: PlannerEntry): string[] {
  if (entry.endDay === entry.startDay) return [];
  const ends = entry.endTime ? ` · ends ${entry.endTime}` : '';
  return [`Day ${entry.startDay} → Day ${entry.endDay}${ends}`];
}

const activity: PlanEntryStrategy<'activity'> = (entry, currency) => ({
  kind: 'activity',
  icon: activityIcon(entry.title),
  title: entry.title,
  label: 'Activity',
  meta: [entry.location, ...spanMeta(entry)],
  notes: entry.activity.notes,
  facts: planFacts(entry.activity, entry.activity.address, currency)
});

const travel: PlanEntryStrategy<'travel'> = (entry, currency) => ({
  kind: 'travel',
  icon: transportModeFor(entry.transfer.mode).icon,
  title: entry.title,
  label: 'Travel',
  meta: [
    ...(entry.transfer.durationMinutes !== null
      ? [formatTransferDuration(entry.transfer.durationMinutes)]
      : []),
    ...spanMeta(entry)
  ],
  notes: entry.transfer.notes,
  facts: planFacts(entry.transfer, null, currency)
});

const stayEventIcons = { check_in: DoorOpen, check_out: LogOut, overnight: BedDouble };

const stay: PlanEntryStrategy<'stay'> = (entry, currency) => ({
  kind: 'stay',
  icon: stayEventIcons[entry.event],
  title: entry.title,
  label: 'Stay',
  meta: [entry.location, ...spanMeta(entry)],
  notes: entry.stay.notes,
  facts: planFacts(entry.stay, entry.stay.address, currency)
});

const entryStrategies = { activity, travel, stay } satisfies {
  [Kind in PlannerEntry['kind']]: PlanEntryStrategy<Kind>;
};

/** The card model of any planner entry, picked by the entry's kind. */
export function planEntryModel(entry: PlannerEntry, currency: string): PlanCardModel {
  // The registry is keyed by kind, so the strategy found always takes this entry's own variant.
  const strategy = entryStrategies[entry.kind] as PlanEntryStrategy<typeof entry.kind>;
  return strategy(entry, currency);
}

/** A stay's own overnight card: when it checks in and out, then the stay's address, cost, files. */
export function stayOvernightModel(
  source: Stay,
  destinationName: string,
  currency: string
): PlanCardModel {
  const time = (day: number, at: string | null) => `Day ${day}${at ? ` · ${at}` : ''}`;
  return {
    kind: 'stay',
    icon: BedDouble,
    title: source.title,
    label: 'Staying overnight',
    meta: [destinationName],
    notes: source.notes,
    facts: [
      {
        key: 'check-in',
        icon: DoorOpen,
        label: `Check in: ${time(source.checkInDay, source.checkInTime)}`
      },
      {
        key: 'check-out',
        icon: LogOut,
        label: `Check out: ${time(source.checkOutDay, source.checkOutTime)}`
      },
      ...planFacts(source, source.address, currency)
    ]
  };
}

/** A stop that has no days yet. */
export function placeModel(destination: Destination): PlanCardModel {
  return {
    kind: 'place',
    icon: MapPin,
    title: destination.name,
    label: 'Stop',
    meta: ['Days to be decided'],
    notes: destination.dayNotes ?? null,
    facts: []
  };
}
