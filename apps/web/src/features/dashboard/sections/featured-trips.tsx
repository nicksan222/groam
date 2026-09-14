import { CoverFrame } from '@groam/ui/components/cover-frame';
import Shell from '@groam/ui/components/shell/client';
import Timeline from '@groam/ui/components/timeline';
import { CalendarDays, MapPin } from 'lucide-react';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { Link } from '@/features/workspace/navigation/router';

export function FeaturedTrips({ trips }: { trips: TripListItem[] }) {
  if (trips.length === 0) return null;

  return (
    <Shell.Section stack="sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Active trips</h2>
        <Link
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          to="/trips"
        >
          See all
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {trips.map((trip) => (
          <Timeline.Card key={trip.id} surface="lift">
            <Link
              className="group block"
              params={{ section: 'overview', tripId: trip.id }}
              to="/trips/$tripId/$section"
            >
              <CoverFrame alt="" className="aspect-[16/10]" src={trip.coverUrl} />
              <Timeline.CardBody className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{trip.name}</h3>
                </div>
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <MapPin className="size-3 shrink-0" />
                  {trip.destination ?? 'Destination undecided'}
                </p>
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <CalendarDays className="size-3 shrink-0" />
                  {trip.dateNotes ?? 'Flexible dates'}
                </p>
                {trip.nextAction ? (
                  <p className="border-t border-border pt-2 text-xs font-medium text-primary">
                    {trip.nextAction}
                  </p>
                ) : null}
              </Timeline.CardBody>
            </Link>
          </Timeline.Card>
        ))}
      </div>
    </Shell.Section>
  );
}
