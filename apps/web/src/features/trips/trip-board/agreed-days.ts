import {
  buildTripPlanner,
  entryPeriod,
  entryTime,
  plannerPeriods
} from '@/features/trips/hooks/trip-day-planner';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { AgreedCard, AgreedDay } from '@/types/trip-board';
import type { PlannerDay, PlannerEntry } from '@/types/trip-planner';

function dayRangeLabel(start: number | null, end: number | null) {
  if (start === null || end === null) return null;
  return start === end ? null : `Days ${start}–${end}`;
}

function entryWhen(entry: PlannerEntry, day: number) {
  const time = entry.startTime ? entryTime(entry, day) : null;
  const period = plannerPeriods.find((item) => item.key === entryPeriod(entry, day));
  return time ?? (period?.key === 'full_day' ? 'All day' : period?.label) ?? null;
}

function entryDetail(entry: PlannerEntry) {
  if (entry.kind === 'activity') return entry.activity.notes?.trim() || entry.location || null;
  return entry.location || null;
}

function stopCards(plan: PlannerDay): AgreedCard[] {
  return plan.destinations
    .filter((destination) => destination.startDay === plan.day)
    .map((destination) => ({
      day: plan.day,
      detail: destination.dayNotes?.trim() || null,
      key: `stop:${destination.id}`,
      kind: 'stop',
      label: dayRangeLabel(destination.startDay, destination.endDay) ?? 'Stop',
      title: destination.name
    }));
}

function entryCards(plan: PlannerDay, seen: Set<string>): AgreedCard[] {
  const fresh = plan.entries.filter((entry) => !seen.has(entry.key));
  return fresh.map((entry) => {
    seen.add(entry.key);
    return {
      day: plan.day,
      detail: entryDetail(entry),
      key: entry.key,
      kind: 'plan',
      label: entryWhen(entry, plan.day) ?? 'Planned',
      title: entry.title
    };
  });
}

/** The agreed itinerary day by day: each stop on the day it starts, then that day's planned entries. */
export function agreedDays(trip: TripDetail): AgreedDay[] {
  const seen = new Set<string>();
  return buildTripPlanner(trip)
    .days.map((plan) => ({
      cards: [...stopCards(plan), ...entryCards(plan, seen)],
      day: plan.day
    }))
    .filter(({ cards }) => cards.length > 0);
}

export const agreedCardCount = (days: readonly AgreedDay[]) =>
  days.reduce((total, { cards }) => total + cards.length, 0);
