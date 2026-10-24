import { Card } from '@groam/ui/components/card';
import { List } from '@groam/ui/components/list';
import { useTripYourTurn } from '@/features/trips/hooks/use-trip-your-turn';
import type { TripDetail } from '@/features/trips/hooks/use-trips';
import { Link } from '@/features/workspace/navigation/router';
import { useParams } from '@/lib/navigation/router';
import { testIds } from '@/lib/test-ids';
import { MandatoryProgress } from './mandatory-progress';
import { YourTurnRow } from './your-turn-row';

const moreSections = [
  { label: 'Ideas', section: 'ideas' },
  { label: 'Issues', section: 'issues' },
  { label: 'Polls', section: 'polls' }
] as const;

/**
 * A slim card above Plan's days: up to three open issues, ideas, and polls waiting on the viewer,
 * how many mandatory issues are done, and, when more wait, small links on to their sections.
 * Hidden until both lists load, and when there is nothing to say.
 */
export function TripYourTurn({ trip }: { trip: TripDetail }) {
  const { isLoading, items, more, progress, total } = useTripYourTurn(
    trip.id,
    trip.archivedAt !== null
  );
  const { tripId: tripReference = trip.id } = useParams<{ tripId: string }>();
  if (isLoading || (items.length === 0 && !progress)) return null;
  const links = moreSections.filter(({ section }) => more[section] > 0);

  return (
    <Card
      aria-label="Your turn"
      className="border-border"
      data-testid={testIds.planYourTurn}
      expand
      role="region"
      variant="inset"
    >
      {items.length > 0 ? (
        <>
          <h2 className="text-sm font-medium">Your turn · {total}</h2>
          <List bleed={false}>
            <List.Body>
              <List.Group aria-label="Your turn">
                {items.map((item) => (
                  <YourTurnRow
                    item={item}
                    key={`${item.kind}:${item.id}`}
                    tripReference={tripReference}
                  />
                ))}
              </List.Group>
            </List.Body>
          </List>
          {links.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {links.map(({ label, section }) => (
                <Link
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  data-section={section}
                  data-testid={testIds.planYourTurnMore}
                  key={section}
                  params={{ section, tripId: tripReference }}
                  to="/trips/$tripId/$section"
                >
                  {more[section]} more in {label}
                </Link>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
      {progress ? <MandatoryProgress {...progress} tripReference={tripReference} /> : null}
    </Card>
  );
}
