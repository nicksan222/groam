import Shell from '@groam/ui/components/shell/client';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { dayCountLabel } from '@/features/trips/trip-duration';
import { budgetLabel } from './trip-budget-label';
import { windowValue } from './trip-window-value';

const overviewPropertyLabels = ['Window', 'Length', 'Stops', 'Total'] as const;

export function OverviewProperties({
  isLoading = false,
  trip
}: {
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
      data-slot="overview-properties"
      items={[
        { label: 'Window', value: windowValue(trip) ?? 'Flexible' },
        { label: 'Length', numeric: true, value: durationLabel(trip.totalDurationDays) },
        { label: 'Stops', numeric: true, value: String(trip.destinations.length) },
        { label: 'Total', numeric: true, value: budgetLabel(trip) }
      ]}
    />
  );
}

function durationLabel(totalDays: number | null) {
  return totalDays === null ? 'Not set' : dayCountLabel(totalDays);
}
