import { Button } from '@groam/ui/components/button';
import Timeline from '@groam/ui/components/timeline';
import { mutedMetaLinkClassName } from '@groam/ui/lib/muted-meta';
import { Coins, FileText, Hotel, MapPin, Pencil, Trash2 } from 'lucide-react';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import { formatDayTimeRange } from '@/features/trips/trip-local-date-time';
import { testIds } from '@/lib/test-ids';
import type { Stay } from './stay-types';

export function StayCard({
  canManage,
  currency,
  onEdit,
  onRemove,
  stay,
  tripStartDate
}: {
  canManage: boolean;
  currency: string;
  onEdit: () => void;
  onRemove: () => void;
  stay: Stay;
  tripStartDate: null | string;
}) {
  const timing = formatDayTimeRange({
    startDate: tripStartDate,
    startDay: stay.checkInDay,
    startTime: stay.checkInTime,
    endDay: stay.checkOutDay,
    endTime: stay.checkOutTime
  });
  return (
    <Timeline.Card
      className="rounded-xl border-border bg-card"
      data-stay-id={stay.id}
      data-stay-name={stay.title}
      data-testid={testIds.stayCard}
    >
      <Timeline.CardBody className="flex items-start gap-3 p-3">
        <Hotel className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{stay.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {timing ?? `Days ${stay.checkInDay}–${stay.checkOutDay}`}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {stay.costAmount !== null && (
              <span className="inline-flex items-center gap-1 font-medium text-foreground/75">
                <Coins className="size-3" />{' '}
                {formatTripLineCost(stay.costAmount, currency, stay.costSplit)}
              </span>
            )}
            {stay.address && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" />{' '}
                <span className="truncate">{stay.address}</span>
              </span>
            )}
          </div>
          {stay.notes && <p className="mt-1.5 text-sm text-muted-foreground">{stay.notes}</p>}
          {stay.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {stay.attachments.map((attachment) =>
                attachment.url ? (
                  <a
                    className={mutedMetaLinkClassName}
                    href={attachment.url}
                    key={attachment.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FileText className="size-3" />
                    <span className="truncate">{attachment.name}</span>
                  </a>
                ) : null
              )}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-1">
            <Button
              aria-label={`Edit ${stay.title}`}
              onClick={onEdit}
              size="icon-sm"
              variant="ghost"
            >
              <Pencil />
            </Button>
            <Button
              aria-label={`Remove ${stay.title}`}
              onClick={onRemove}
              size="icon-sm"
              variant="ghost"
            >
              <Trash2 />
            </Button>
          </div>
        )}
      </Timeline.CardBody>
    </Timeline.Card>
  );
}
