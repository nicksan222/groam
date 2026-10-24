import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import Shell from '@groam/ui/components/shell/client';
import { useState } from 'react';
import { HOME_TURN_LIMIT } from '@/features/dashboard/hooks/dashboard-model';
import { testIds } from '@/lib/test-ids';
import type { TripsTurn } from '@/types/dashboard';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { TurnRow } from './turn-row';

/**
 * One row under the list: the toggle for every loaded item, then, on the same line, a quiet note
 * only when something is missing ("18 more in other trips", "· from your 12 most recent trips").
 */
function TurnFooter({
  expanded,
  onToggle,
  turn,
  unloaded
}: {
  expanded: boolean;
  onToggle: () => void;
  turn: TripsTurn;
  unloaded: number;
}) {
  const toggles = turn.items.length > HOME_TURN_LIMIT;
  if (!toggles && unloaded <= 0 && !turn.truncated) return null;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
      {toggles ? (
        <Button
          aria-expanded={expanded}
          className="-ml-3 w-fit text-muted-foreground"
          data-testid={testIds.homeTurnToggle}
          onClick={onToggle}
          size="sm"
          variant="ghost"
        >
          {expanded ? 'Show fewer' : `Show all ${turn.items.length}`}
        </Button>
      ) : null}
      {unloaded > 0 || turn.truncated ? (
        <p data-testid={testIds.homeTurnNote}>
          {unloaded > 0 ? `${unloaded} more in other trips` : null}
          {unloaded > 0 && turn.truncated ? ' · ' : null}
          {turn.truncated ? `from your ${turn.checked} most recent trips` : null}
        </p>
      ) : null}
    </div>
  );
}

/** Five rows and one footer row. */
function TurnList({ turn }: { turn: TripsTurn }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? turn.items : turn.items.slice(0, HOME_TURN_LIMIT);
  const unloaded = turn.total - turn.items.length;
  return (
    <>
      <List>
        <List.Body>
          <List.Group aria-label="Your turn">
            {shown.map((item) => (
              <TurnRow item={item} key={`${item.kind}:${item.id}`} />
            ))}
          </List.Group>
        </List.Body>
      </List>
      <TurnFooter
        expanded={expanded}
        onToggle={() => setExpanded((open) => !open)}
        turn={turn}
        unloaded={unloaded}
      />
    </>
  );
}

/**
 * What waits on the viewer across their trips, soonest due first. `turn` is `undefined` while it
 * loads (a placeholder, never an empty list) and `null` when it could not be read (the section
 * leaves the page rather than claim nothing is waiting).
 */
export function YourTurn({ turn }: { turn: TripsTurn | null | undefined }) {
  if (turn === null) return null;
  return (
    <Shell.Section aria-labelledby="dashboard-turn-heading" stack="sm">
      <DashboardSectionHeading id="dashboard-turn-heading" title="Your turn" />
      {turn === undefined ? <PageLoading label="Loading what is waiting on you…" /> : null}
      {turn && turn.total === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid={testIds.homeNothingWaiting}>
          {turn.truncated
            ? `Nothing waiting in your ${turn.checked} most recent trips.`
            : 'Nothing is waiting on you.'}
        </p>
      ) : null}
      {turn && turn.total > 0 ? <TurnList turn={turn} /> : null}
    </Shell.Section>
  );
}
