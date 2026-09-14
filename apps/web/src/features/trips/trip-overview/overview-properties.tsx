import Shell from '@groam/ui/components/shell/client';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { formatTripCost } from '@/features/trips/trip-forms/trip-currencies';
import { formatTripDay } from '@/features/trips/trip-local-date-time';

const overviewPropertyLabels = ['Window', 'Length', 'Stops', 'Total'] as const;

export function OverviewProperties({
  compact = false,
  isLoading = false,
  trip
}: {
  compact?: boolean;
  isLoading?: boolean;
  trip?: TripDetail;
}) {
  if (isLoading || !trip) {
    return (
      <Shell.PropertyGrid
        aria-label="Trip facts"
        data-slot="overview-properties"
        isLoading
        loadingLabels={overviewPropertyLabels}
      />
    );
  }

  return (
    <Shell.PropertyGrid
      aria-label="Trip facts"
      className={
        compact
          ? 'grid grid-cols-2 divide-y-0 [&>div]:block [&_dd]:text-left [&_dt]:mb-1'
          : undefined
      }
      data-slot="overview-properties"
      items={[
        { label: 'Window', value: windowValue(trip) },
        { label: 'Length', numeric: true, value: durationLabel(trip.totalDurationDays) },
        { label: 'Stops', numeric: true, value: String(trip.destinations.length) },
        { label: 'Total', numeric: true, value: budgetLabel(trip) }
      ]}
    />
  );
}

function budgetLabel(trip: TripDetail) {
  const planned = formatTripCost(trip.totalPlannedCost, trip.currency);
  if (trip.initialBudget === null) return planned;
  return `${planned} / ${formatTripCost(trip.initialBudget, trip.currency)}`;
}

function durationLabel(totalDays: number | null) {
  return totalDays === null ? 'Not set' : `${totalDays} day${totalDays === 1 ? '' : 's'}`;
}

function windowValue(trip: TripDetail) {
  if (trip.startDate) {
    const start = formatTripDay(trip.startDate, 1);
    if (trip.totalDurationDays !== null && trip.totalDurationDays > 1) {
      return `${start} – ${formatTripDay(trip.startDate, trip.totalDurationDays)}`;
    }
    return start;
  }
  const notes = trip.dateNotes?.trim();
  return notes ? notes : 'Flexible';
}
