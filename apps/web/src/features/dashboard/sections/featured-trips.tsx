import { CoverFrame } from '@groam/ui/components/cover-frame';
import Shell from '@groam/ui/components/shell/client';
import { ArrowRight, CalendarDays, MapPin } from 'lucide-react';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { Link } from '@/features/workspace/navigation/router';

export function FeaturedTrips({ trips }: { trips: TripListItem[] }) {
  return (
    <Shell.Section aria-labelledby="dashboard-trips-heading" stack="sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2
            className="text-base font-semibold tracking-tight text-foreground"
            id="dashboard-trips-heading"
          >
            Continue planning
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Your active trips, ready to pick up.</p>
        </div>
        <Link
          className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          to="/trips"
        >
          View trips
        </Link>
      </div>
      {trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6">
          <p className="text-sm font-medium text-foreground">No active trips yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a trip to give the group a place to start planning.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {trips.map((trip) => (
            <Link
              className="group grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border p-2.5 last:border-b-0 hover:bg-muted/60 sm:grid-cols-[5.5rem_minmax(0,1fr)_auto] sm:gap-4"
              key={trip.id}
              params={{ section: 'overview', tripId: trip.id }}
              to="/trips/$tripId/$section"
            >
              <CoverFrame
                alt=""
                className="aspect-[4/3] rounded-md border border-border bg-muted"
                src={trip.coverUrl}
              />
              <span className="min-w-0">
                <h3 className="truncate text-sm font-semibold text-foreground">{trip.name}</h3>
                <span className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{trip.destination ?? 'Destination undecided'}</span>
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <CalendarDays className="size-3 shrink-0" />
                    <span className="truncate">{trip.dateNotes ?? 'Flexible dates'}</span>
                  </span>
                </span>
                <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium">
                  {trip.nextAction ? (
                    <span className="max-w-full shrink-0 truncate text-primary">
                      {trip.nextAction}
                    </span>
                  ) : null}
                  {trip.outstandingActionCount > 0 ? (
                    <span className="shrink-0 text-warning-foreground">
                      {trip.outstandingActionCount}{' '}
                      {trip.outstandingActionCount === 1 ? 'item needs' : 'items need'} attention
                    </span>
                  ) : null}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          ))}
        </div>
      )}
    </Shell.Section>
  );
}
