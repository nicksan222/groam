import { History } from '@groam/icons';
import { RecordListBadge } from '@groam/ui/components/record-list-badge';
import { RecordListItem } from '@groam/ui/components/record-list-item';
import {
  activityTypeLabels,
  type TripActivityItem
} from '@/features/trips/hooks/trip-activity-history-filter';

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
});

export function TripActivityHistoryRow({ item }: { item: TripActivityItem }) {
  return (
    <RecordListItem
      data-activity-id={item.id}
      data-activity-type={item.type}
      icon={<History aria-hidden className="text-muted-foreground" />}
      metadata={
        <>
          <RecordListBadge className="max-w-40 truncate">
            {activityTypeLabels[item.type]}
          </RecordListBadge>
          <span className="truncate">{item.actorName}</span>
          <time
            className="ml-auto shrink-0 tabular-nums"
            dateTime={new Date(item.createdAt).toISOString()}
          >
            {dateTimeFormatter.format(item.createdAt)}
          </time>
        </>
      }
      title={<span title={item.message}>{item.message}</span>}
    />
  );
}
