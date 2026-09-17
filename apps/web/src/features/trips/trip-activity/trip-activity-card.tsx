import { Button } from '@groam/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@groam/ui/components/dropdown-menu';
import Timeline from '@groam/ui/components/timeline';
import { mutedMetaLabelClassName, mutedMetaLinkClassName } from '@groam/ui/lib/muted-meta';
import {
  Coins,
  ExternalLink,
  FileText,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2
} from 'lucide-react';
import type { TimeBlock, TripActivity } from '@/features/trips/hooks/use-trip-activity-editor';
import { formatTripLineCost } from '@/features/trips/trip-forms/trip-cost';
import { formatDayTimeRange, formatTripDay } from '@/features/trips/trip-local-date-time';
import { testIds } from '@/lib/test-ids';

const timeLabels: Record<TimeBlock, string> = {
  afternoon: 'Afternoon',
  evening: 'Evening',
  full_day: 'Full day',
  morning: 'Morning'
};

function activityDays(activity: TripActivity, tripStartDate: null | string) {
  return activity.dayNumber === activity.endDayNumber
    ? formatTripDay(tripStartDate, activity.dayNumber)
    : `${formatTripDay(tripStartDate, activity.dayNumber)} – ${formatTripDay(
        tripStartDate,
        activity.endDayNumber
      )}`;
}

export function TripActivityCard({
  activity,
  canManage,
  currency,
  onEdit,
  onRemove,
  tripStartDate
}: {
  activity: TripActivity;
  canManage: boolean;
  currency: string;
  onEdit: (activity: TripActivity) => void;
  onRemove: (activity: TripActivity) => Promise<void>;
  tripStartDate: null | string;
}) {
  const exactTiming = formatDayTimeRange({
    startDate: tripStartDate,
    startDay: activity.dayNumber,
    startTime: activity.startTime,
    endDay: activity.endDayNumber,
    endTime: activity.endTime
  });
  return (
    <Timeline.Card
      className="rounded-xl border-border bg-transparent"
      data-activity-id={activity.id}
      data-activity-title={activity.title}
      data-testid={testIds.activityCard}
    >
      <Timeline.CardBody className="flex items-start gap-3 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-tight">{activity.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {exactTiming ??
              `${activityDays(activity, tripStartDate)} · ${timeLabels[activity.timeBlock]}`}
          </p>
          {activity.costAmount !== null && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-foreground/75">
              <Coins className="size-3" />{' '}
              {formatTripLineCost(activity.costAmount, currency, activity.costSplit)}
            </p>
          )}
          {activity.address && (
            <a
              className="mt-2 flex max-w-full items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activity.address)}`}
              rel="noreferrer"
              target="_blank"
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{activity.address}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
          )}
          {activity.notes && (
            <p
              className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground"
              title={activity.notes}
            >
              {activity.notes}
            </p>
          )}
          {activity.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {activity.attachments.map((attachment) =>
                attachment.url ? (
                  <a
                    className={mutedMetaLinkClassName}
                    href={attachment.url}
                    key={attachment.id}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </a>
                ) : (
                  <span className={mutedMetaLabelClassName} key={attachment.id}>
                    <FileText className="size-3 shrink-0" />
                    <span className="truncate">{attachment.name}</span>
                  </span>
                )
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={`Actions for ${activity.title}`}
                  data-testid={testIds.activityActions}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  data-testid={testIds.activityEdit}
                  onSelect={() => onEdit(activity)}
                >
                  <Pencil /> Edit activity
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void onRemove(activity)} variant="destructive">
                  <Trash2 /> Remove activity
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Timeline.CardBody>
    </Timeline.Card>
  );
}
