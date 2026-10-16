import { BedDouble, FileText, MapPin, Route } from 'lucide-react';
import type { ReactNode } from 'react';
import { entryTime } from '@/features/trips/hooks/trip-day-planner';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import { formatTransferDuration } from '@/features/trips/trip-transfer-options';
import type { PlannerEntry } from '@/types/trip-planner';

function EntryKindIcon({ kind }: { kind: PlannerEntry['kind'] }) {
  if (kind === 'travel') return <Route className="size-3 shrink-0" />;
  if (kind === 'stay') return <BedDouble className="size-3 shrink-0" />;
  return <MapPin className="size-3 shrink-0" />;
}

function EntryHeading({ entry }: { entry: PlannerEntry }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-sm font-medium leading-6">{entry.title}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <EntryKindIcon kind={entry.kind} />
        {entry.location}
      </p>
      {entry.endDay !== entry.startDay ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Day {entry.startDay} → Day {entry.endDay}
          {entry.endTime ? ` · ends ${entry.endTime}` : ''}
        </p>
      ) : null}
    </div>
  );
}

function EntryDetails({ currency, entry }: { currency: string; entry: PlannerEntry }) {
  const source =
    entry.kind === 'activity'
      ? entry.activity
      : entry.kind === 'stay'
        ? entry.stay
        : entry.transfer;
  const address =
    entry.kind === 'activity'
      ? entry.activity.address
      : entry.kind === 'stay'
        ? entry.stay.address
        : null;
  const empty =
    !source.notes &&
    !address &&
    source.costAmount === null &&
    source.attachments.length === 0 &&
    !(entry.kind === 'travel' && entry.transfer.durationMinutes !== null);
  if (empty) return null;
  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
      {entry.kind === 'travel' && entry.transfer.durationMinutes !== null ? (
        <p>{formatTransferDuration(entry.transfer.durationMinutes)} travel time</p>
      ) : null}
      {address ? (
        <a
          className="block underline underline-offset-4"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          rel="noreferrer"
          target="_blank"
        >
          {address}
        </a>
      ) : null}
      {source.notes ? <p className="whitespace-pre-wrap break-words">{source.notes}</p> : null}
      {source.costAmount !== null ? (
        <p>{formatTripLineCost(source.costAmount, currency, source.costSplit)}</p>
      ) : null}
      {source.attachments.map((attachment) =>
        attachment.url ? (
          <a
            className="flex items-center gap-2 underline underline-offset-4"
            href={attachment.url}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
          >
            <FileText className="size-3 shrink-0" />
            {attachment.name}
          </a>
        ) : (
          <span key={attachment.id}>{attachment.name}</span>
        )
      )}
    </div>
  );
}

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
      <div className="min-w-0 rounded-md bg-muted/30 px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <EntryHeading entry={entry} />
          </div>
          {action}
        </div>
        <EntryDetails currency={currency} entry={entry} />
      </div>
    </div>
  );
}
