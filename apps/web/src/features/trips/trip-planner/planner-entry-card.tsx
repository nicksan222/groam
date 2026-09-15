import { BedDouble, ChevronDown, FileText, MapPin, Route } from 'lucide-react';
import { entryTime } from '@/features/trips/hooks/trip-day-planner';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import { formatTransferDuration } from '@/features/trips/trip-transfer-options';
import type { PlannerEntry } from '@/types/trip-planner';

function EntryKindIcon({ kind }: { kind: PlannerEntry['kind'] }) {
  if (kind === 'travel') return <Route className="size-3 shrink-0" />;
  if (kind === 'stay') return <BedDouble className="size-3 shrink-0" />;
  return <MapPin className="size-3 shrink-0" />;
}

function EntrySummary({ entry }: { entry: PlannerEntry }) {
  return (
    <summary className="flex cursor-pointer list-none items-start gap-3 p-3 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4 [&::-webkit-details-marker]:hidden">
      <span className="min-w-0 flex-1">
        <span className="block break-words text-sm font-semibold leading-6">{entry.title}</span>
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <EntryKindIcon kind={entry.kind} />
          {entry.location}
        </span>
        {entry.endDay !== entry.startDay ? (
          <span className="mt-2 block text-xs text-muted-foreground">
            Day {entry.startDay} → Day {entry.endDay}
            {entry.endTime ? ` · ends ${entry.endTime}` : ''}
          </span>
        ) : null}
      </span>
      <ChevronDown
        aria-hidden
        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
      />
    </summary>
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
    !source.notes && !address && source.costAmount === null && source.attachments.length === 0;
  return (
    <div className="space-y-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
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
      {empty ? <p>No additional details yet.</p> : null}
    </div>
  );
}

export function PlannerEntryCard({
  entry,
  day,
  currency
}: {
  entry: PlannerEntry;
  day: number;
  currency: string;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
      <div className="pt-3 text-xs font-semibold tabular-nums text-foreground sm:text-sm">
        {entryTime(entry, day)}
        {entry.kind !== 'stay' && entry.startTime && !entry.endTime && entry.startDay === day ? (
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            End time open
          </span>
        ) : null}
      </div>
      <details className="group min-w-0 rounded-xl border border-border bg-card open:shadow-sm">
        <EntrySummary entry={entry} />
        <EntryDetails currency={currency} entry={entry} />
      </details>
    </div>
  );
}
