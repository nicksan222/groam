import type { RosterCounts } from '@/types/trip-people';
import type { RosterStatus, TripTraveler } from '@/types/trips';
import { FACE_ORDER, faceLabel } from './trip-face-states';
import { TripReadinessBar } from './trip-readiness-bar';
import { TripReadinessLegend } from './trip-readiness-legend';
import { TripSeatStrip } from './trip-seat-strip';

/** Beyond this many people the faces stop being readable and the strip gives way to the bar. */
const FACES_MAX = 60;

/** The plan's cost line is "≈ $1,500 planned per traveler"; the amount leads in foreground. */
function PerTraveler({ label }: { label: string }) {
  const amount = label.replace(/ planned per traveler$/u, '');
  return (
    <p className="text-sm text-muted-foreground max-sm:hidden @3xl/people:ml-auto">
      <span className="font-medium text-foreground">{amount}</span> planned per traveler
    </p>
  );
}

/**
 * How ready the group is: "18 of 27 cleared to go · 3 blocked · 4 deciding · 2 out" with the
 * plan's cost per traveler at its right, then the group as a strip of faces (cleared, blocked,
 * deciding, out) over a count legend; past 60 people, one bar of segments sized by headcount.
 * Without payments nobody is blocked and "cleared" simply reads "going".
 */
export function TripReadiness({
  counts,
  groups,
  perTraveler,
  takesPayments,
  testId
}: {
  counts: RosterCounts;
  groups: Record<RosterStatus, TripTraveler[]>;
  perTraveler: string | undefined;
  takesPayments: boolean;
  testId: string;
}) {
  const total = counts.going + counts.invited + counts.maybe + counts.not_going;
  const rest = FACE_ORDER.slice(1)
    .filter((status) => counts[status] > 0)
    .map((status) => `${counts[status]} ${faceLabel(status, takesPayments)}`);
  return (
    <section aria-label="Readiness" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm" data-testid={testId}>
          <strong className="text-[15px] font-semibold text-foreground">
            {counts.going} of {total} {takesPayments ? 'cleared to go' : 'going'}
          </strong>
          {rest.length > 0 ? (
            <span className="text-muted-foreground">· {rest.join(' · ')}</span>
          ) : null}
        </p>
        {perTraveler ? <PerTraveler label={perTraveler} /> : null}
      </div>
      {total <= FACES_MAX ? (
        <>
          <TripSeatStrip counts={counts} groups={groups} takesPayments={takesPayments} />
          <TripReadinessLegend counts={counts} takesPayments={takesPayments} />
        </>
      ) : (
        <TripReadinessBar counts={counts} takesPayments={takesPayments} />
      )}
    </section>
  );
}
