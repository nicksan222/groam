import { List } from '@groam/ui/components/list';
import { QueueDueText } from '@/features/trip-queue/queue-due-text';
import { queueKindSection } from '@/features/trip-queue/queue-sections';
import { QueueStatusPill } from '@/features/trip-queue/queue-status-pill';
import { tripSectionConfig } from '@/features/trips/trip-sections';
import { Link } from '@/features/workspace/navigation/router';
import { testIds } from '@/lib/test-ids';
import type { QueueItem } from '@/types/queue';

/** One thing waiting on the viewer: its section's icon, the title as the link, its state, and any due date. */
export function YourTurnRow({
  item,
  tripReference
}: {
  item: QueueItem;
  /** The trip as links write it. */
  tripReference: string;
}) {
  const section = queueKindSection[item.kind];
  const { icon: KindIcon, label } = tripSectionConfig[section];
  const title = (
    <>
      <span className="sr-only">{label}: </span>
      <span title={item.title}>{item.title}</span>
    </>
  );
  return (
    <List.Row data-testid={testIds.planYourTurnRow} data-title={item.title}>
      <List.Icon>
        <KindIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </List.Icon>
      <List.Main>
        <List.Title asChild>
          {item.kind === 'poll' ? (
            // A poll opens in place in its queue, so the row leads to the polls queue.
            <Link params={{ section, tripId: tripReference }} to="/trips/$tripId/$section">
              {title}
            </Link>
          ) : (
            <Link {...item.href}>{title}</Link>
          )}
        </List.Title>
        {item.dueAt === undefined ? null : (
          <List.Aside>
            <QueueDueText dueAt={item.dueAt} kind={item.kind} />
          </List.Aside>
        )}
      </List.Main>
      <List.Meta>
        <QueueStatusPill status={item.status} />
      </List.Meta>
    </List.Row>
  );
}
