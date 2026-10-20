import { Calendar } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import {
  exportTripCalendar,
  tripCalendarExportBlocker
} from '@/features/trips/trip-calendar-export';
import { testIds } from '@/lib/test-ids';

export function TripCalendarExportButton({ trip }: { trip: TripDetail }) {
  const blocker = tripCalendarExportBlocker(trip);
  return (
    <div className="space-y-1.5">
      <Button
        className="w-full"
        data-testid={testIds.tripCalendarExport}
        disabled={blocker !== null}
        onClick={() => exportTripCalendar(trip)}
        size="sm"
        title={blocker ?? 'Download calendar file'}
        type="button"
        variant="outline"
      >
        <Calendar />
        Export calendar
      </Button>
      {blocker ? <p className="text-xs leading-5 text-muted-foreground">{blocker}</p> : null}
    </div>
  );
}
