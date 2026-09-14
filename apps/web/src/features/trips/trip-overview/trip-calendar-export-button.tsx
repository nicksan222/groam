import { Button } from '@groam/ui/components/button';
import { toast } from '@groam/ui/components/toast';
import { Calendar } from 'lucide-react';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { downloadTripCalendar } from '@/features/trips/trip-calendar-export';
import { testIds } from '@/lib/test-ids';

export function TripCalendarExportButton({ trip }: { trip: TripDetail }) {
  const canExport =
    Boolean(trip.startDate) &&
    trip.destinations.some(
      (destination) =>
        (destination.startDay !== null && destination.endDay !== null) ||
        destination.activities.length > 0
    );
  const unavailableReason = !trip.startDate
    ? 'Add an exact start date to export a calendar.'
    : 'Schedule a stop or activity to export a calendar.';
  return (
    <div className="space-y-1.5">
      <Button
        className="w-full"
        data-testid={testIds.tripCalendarExport}
        disabled={!canExport}
        onClick={() => {
          if (!downloadTripCalendar(trip)) {
            toast.error('The trip calendar could not be created.');
          }
        }}
        size="sm"
        title={canExport ? 'Download calendar file' : unavailableReason}
        type="button"
        variant="outline"
      >
        <Calendar />
        Export calendar
      </Button>
      {canExport ? null : (
        <p className="text-xs leading-5 text-muted-foreground">{unavailableReason}</p>
      )}
    </div>
  );
}
