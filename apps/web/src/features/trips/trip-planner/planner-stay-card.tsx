import { BedDouble, FileText } from 'lucide-react';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import type { Stay } from '@/types/trips';

export function PlannerStayCard({
  stay,
  destinationName,
  currency
}: {
  stay: Stay;
  destinationName: string;
  currency: string;
}) {
  const timing = 'Staying overnight';
  return (
    <details className="rounded-xl bg-muted/40 p-3">
      <summary className="flex cursor-pointer list-none items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <BedDouble className="mt-0.5 size-4 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{stay.title}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            {timing} · {destinationName}
          </span>
        </span>
      </summary>
      <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
        <p>
          Check in: Day {stay.checkInDay}
          {stay.checkInTime ? ` · ${stay.checkInTime}` : ''}
        </p>
        <p>
          Check out: Day {stay.checkOutDay}
          {stay.checkOutTime ? ` · ${stay.checkOutTime}` : ''}
        </p>
        {stay.address ? <p>{stay.address}</p> : null}
        {stay.notes ? <p className="whitespace-pre-wrap">{stay.notes}</p> : null}
        {stay.costAmount !== null ? (
          <p>{formatTripLineCost(stay.costAmount, currency, stay.costSplit)}</p>
        ) : null}
        {stay.attachments.map((attachment) =>
          attachment.url ? (
            <a
              className="flex items-center gap-2 underline"
              href={attachment.url}
              key={attachment.id}
              target="_blank"
              rel="noreferrer"
            >
              <FileText className="size-3" />
              {attachment.name}
            </a>
          ) : (
            <span key={attachment.id}>{attachment.name}</span>
          )
        )}
      </div>
    </details>
  );
}
