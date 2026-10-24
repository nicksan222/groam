import { Route } from '@groam/icons';
import Shell from '@groam/ui/components/shell/client';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import type { PlannerDay } from '@/types/trip-planner';
import { RouteDayList } from './route-day-list';
import { RouteStopRow } from './route-stop-row';

function travelTimeLabel(destinations: TripDetail['destinations']): string | null {
  const minutes = destinations.reduce(
    (sum, { transferToNext }) => sum + (transferToNext?.durationMinutes ?? 0),
    0
  );
  if (minutes === 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours} h` : '', rest > 0 ? `${rest} min` : ''].filter(Boolean).join(' ');
}

const noDays: PlannerDay[] = [];

/** The route beside the plan: trip-at-a-glance numbers, and every stop with what is planned and how you get on. */
export function TripRouteSummary({
  days = noDays,
  destinations,
  dayPlanner = false,
  startDate = null
}: {
  days?: PlannerDay[];
  destinations: TripDetail['destinations'];
  dayPlanner?: boolean;
  startDate?: string | null;
}) {
  const travel = travelTimeLabel(destinations);
  const activities = destinations.reduce((sum, { activities: list }) => sum + list.length, 0);
  const facts = [
    `${destinations.length} ${destinations.length === 1 ? 'stop' : 'stops'}`,
    activities > 0 ? `${activities} ${activities === 1 ? 'activity' : 'activities'}` : null,
    travel ? `${travel} in transit` : null
  ].filter(Boolean);

  return (
    <div className="min-w-0">
      <Shell.Card className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <Route className="size-4 text-primary" /> Route
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{facts.join(' · ')}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <nav aria-label="Jump to a destination" className="p-2 pt-3">
            <ol>
              {destinations.map((destination, index) => (
                <RouteStopRow
                  dayPlanner={dayPlanner}
                  destination={destination}
                  isLast={index === destinations.length - 1}
                  key={destination.id}
                  number={index + 1}
                />
              ))}
            </ol>
          </nav>
          <RouteDayList days={days} startDate={startDate} />
        </div>
      </Shell.Card>
    </div>
  );
}
