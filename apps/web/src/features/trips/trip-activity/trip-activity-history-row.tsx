import {
  Archive,
  BedDouble,
  Bus,
  Footprints,
  GitMerge,
  type Icon,
  ImageIcon,
  Lightbulb,
  MapPin,
  Pencil,
  Plane,
  Users
} from '@groam/icons';
import { List } from '@groam/ui/components/list';
import {
  activityMessage,
  type ActivityType,
  type TripActivityItem
} from '@/features/trips/hooks/trip-activity-history-filter';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';

const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/** One icon per kind of event, so a scan of the list tells destinations from stays from travel. */
const icons: Record<ActivityType, Icon> = {
  activity_transfer_removed: Bus,
  activity_transfer_updated: Bus,
  boundary_transfer_removed: Bus,
  boundary_transfer_updated: Bus,
  cover_updated: ImageIcon,
  destination_added: MapPin,
  destination_removed: MapPin,
  destination_transfer_removed: Bus,
  destination_transfer_updated: Bus,
  destination_updated: MapPin,
  details_updated: Pencil,
  itinerary_activity_added: Footprints,
  itinerary_activity_removed: Footprints,
  itinerary_activity_updated: Footprints,
  member_role_updated: Users,
  proposed_version_created: Lightbulb,
  proposed_version_merged: GitMerge,
  stay_added: BedDouble,
  stay_removed: BedDouble,
  stay_updated: BedDouble,
  trip_archived: Archive,
  trip_created: Plane,
  trip_restored: Archive
};

/** One event: what happened (in the viewer's words), with the time; the day is a heading above. */
export function TripActivityHistoryRow({ item }: { item: TripActivityItem }) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const message = activityMessage(item, viewerUserId);
  const KindIcon = icons[item.type];
  return (
    <List.Row data-activity-id={item.id} data-activity-type={item.type}>
      <List.Icon>
        <KindIcon aria-hidden className="size-4 text-muted-foreground" />
      </List.Icon>
      <List.Main>
        <List.Title title={message}>{message}</List.Title>
        <List.Aside className="text-xs text-muted-foreground">
          <time
            dateTime={new Date(item.createdAt).toISOString()}
            title={new Date(item.createdAt).toLocaleString()}
          >
            {timeFormatter.format(item.createdAt)}
          </time>
        </List.Aside>
      </List.Main>
    </List.Row>
  );
}
