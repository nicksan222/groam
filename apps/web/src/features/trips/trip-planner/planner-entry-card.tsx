import type { ReactNode } from 'react';
import { entryTime } from '@/features/trips/hooks/trip-day-planner';
import type { PlannerEntry } from '@/types/trip-planner';
import { PlanCardFromModel } from './plan-card-from-model';
import { planEntryModel } from './plan-kind-strategies';

export function PlannerEntryCard({
  action,
  currency,
  day,
  entry,
  timeLabel
}: {
  /** An edit control shown beside the title when the card is editable. */
  action?: ReactNode;
  currency: string;
  day: number;
  entry: PlannerEntry;
  /** Replaces the computed time, for example "Overnight". */
  timeLabel?: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-2 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-3">
      <div className="pt-3 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
        {timeLabel ?? entryTime(entry, day)}
        {entry.kind !== 'stay' && entry.startTime && !entry.endTime && entry.startDay === day ? (
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            End time open
          </span>
        ) : null}
      </div>
      <PlanCardFromModel action={action} model={planEntryModel(entry, currency)} />
    </div>
  );
}
