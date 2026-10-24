import { CalendarDays, MapPin } from '@groam/icons';
import { CoverFrame } from '@groam/ui/components/cover-frame';
import { Heading } from '@groam/ui/components/heading';
import { IconTile } from '@groam/ui/components/icon-tile';
import type { TripListItem } from '@/features/trips/hooks/use-trips';
import { defaultTripSection } from '@/features/trips/trip-sections';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn, TripTurnCounts } from '@/types/dashboard';

const countedSections = [
  ['ideas', 'idea'],
  ['issues', 'issue'],
  ['polls', 'poll']
] as const;

/**
 * The sections of a trip that wait on the viewer, with how many. A count of zero says nothing, so
 * it is left out; each count opens that section on the viewer's own items.
 */
function TurnCounts({
  counts,
  tripName,
  tripReference
}: {
  counts: TripTurnCounts | undefined;
  tripName: string;
  tripReference: string;
}) {
  const waiting = countedSections.filter(([section]) => (counts?.[section] ?? 0) > 0);
  if (!counts || waiting.length === 0) return null;
  return (
    <ul className="relative z-10 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs">
      {waiting.map(([section, noun]) => {
        const count = counts[section];
        const text = `${count} ${count === 1 ? noun : `${noun}s`}`;
        return (
          <li key={section}>
            <Link
              aria-label={`${text} waiting on you in ${tripName}`}
              className="inline-flex items-center gap-2 rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
              data-section={section}
              data-testid={testIds.homeTripCount}
              params={{ section, tripId: tripReference }}
              to="/trips/$tripId/$section"
            >
              <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              <span aria-hidden>{text}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Below the facts of a card: what waits on the viewer. While the numbers load, a placeholder
 * holds the space (never a zero); a trip the viewer has no seat on says how to join; an archived
 * trip says so. `turn` is `null` where counts are not wanted.
 */
function CardFooter({
  counts,
  trip,
  turn
}: {
  counts: TripTurnCounts | undefined;
  trip: TripListItem;
  turn: TripsTurn | null | undefined;
}) {
  if (trip.archivedAt !== null) return <p className="text-xs text-muted-foreground">Archived</p>;
  if (!trip.canParticipate) {
    return <p className="text-xs font-medium text-primary">{trip.nextAction}</p>;
  }
  if (turn === undefined) return null;
  return (
    <TurnCounts counts={counts} tripName={trip.name} tripReference={trip.shortId ?? trip.id} />
  );
}

/**
 * One trip as a card: a small tile (its cover, else its initial), name,
 * where and when, and the quiet counts of what waits on the viewer. The whole card opens the
 * trip; the counts sit above that link. Cards in a row share a height, with counts at the bottom.
 */
export function TripCard({
  counts,
  trip,
  turn
}: {
  counts?: TripTurnCounts | undefined;
  trip: TripListItem;
  turn: TripsTurn | null | undefined;
}) {
  const reference = trip.shortId ?? trip.id;
  return (
    <li
      className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors focus-within:border-ring hover:border-foreground/25"
      data-archived={trip.archivedAt !== null || undefined}
      data-testid={testIds.tripCard}
      data-trip-id={trip.id}
      data-trip-name={trip.name}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <div className="flex min-w-0 items-start gap-3">
          {trip.coverUrl ? (
            <CoverFrame
              alt=""
              className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted"
              src={trip.coverUrl}
            />
          ) : (
            <IconTile aria-hidden className="text-sm font-semibold" size="lg" variant="muted">
              {trip.name.trim().charAt(0).toUpperCase() || <MapPin className="size-4" />}
            </IconTile>
          )}
          <div className="min-w-0">
            <Heading level={3} size="sm" className="truncate text-foreground">
              <Link
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring"
                params={{ section: defaultTripSection, tripId: reference }}
                to="/trips/$tripId/$section"
              >
                {trip.name}
              </Link>
            </Heading>
            <span className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{trip.destination ?? 'Destination undecided'}</span>
              </span>
              <span className="inline-flex min-w-0 items-center gap-1">
                <CalendarDays aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{trip.dateNotes ?? 'Flexible dates'}</span>
              </span>
            </span>
          </div>
        </div>
        {turn === null && trip.archivedAt === null && trip.canParticipate ? null : (
          <div className="mt-auto min-h-4">
            <CardFooter counts={counts} trip={trip} turn={turn} />
          </div>
        )}
      </div>
    </li>
  );
}
