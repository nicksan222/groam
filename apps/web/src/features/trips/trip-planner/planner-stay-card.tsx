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
    <div className="rounded-md bg-muted/30 p-3">
      <div className="flex items-start gap-3">
        <BedDouble className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-sm font-medium">{stay.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {timing} · {destinationName}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
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
    </div>
  );
}
