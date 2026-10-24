import { List } from '@groam/ui/components/list';
import { QueueDueText } from '@/features/trip-queue/queue-due-text';
import { turnItemPresentation } from '@/features/trip-queue/queue-items';
import { queueKindSection } from '@/features/trip-queue/queue-sections';
import { QueueStatusPill } from '@/features/trip-queue/queue-status-pill';
import { tripSectionConfig } from '@/features/trips/trip-sections';
import { Link } from '@/features/workspace/navigation/router';
import { useOptionalWorkspace } from '@/features/workspace/workspace-shell/workspace-state';
import { testIds } from '@/lib/test-ids';
import type { TurnItem } from '@/types/dashboard';

const kindWord = { idea: 'Idea', issue: 'Issue', poll: 'Poll' } as const;

/**
 * One thing waiting on the viewer, styled like a trip's queue rows with the trip named: its
 * section's icon, the title as the link, a kind word and the trip, its state, and any due date.
 */
export function TurnRow({ item }: { item: TurnItem }) {
  const viewerUserId = useOptionalWorkspace()?.session.user.id;
  const { href, status } = turnItemPresentation(item, viewerUserId);
  const { icon: KindIcon } = tripSectionConfig[queueKindSection[item.kind]];
  return (
    <List.Row data-kind={item.kind} data-testid={testIds.homeTurnRow} data-title={item.title}>
      <List.Icon>
        <KindIcon aria-hidden className="size-4 text-muted-foreground" />
      </List.Icon>
      <List.Main>
        <List.Title asChild>
          <Link title={item.title} {...href}>
            {item.title}
          </Link>
        </List.Title>
        {item.dueAt === null ? null : (
          <List.Aside>
            <QueueDueText dueAt={item.dueAt} kind={item.kind} />
          </List.Aside>
        )}
        <List.Description>
          {kindWord[item.kind]} · <span title={item.tripName}>{item.tripName}</span>
        </List.Description>
      </List.Main>
      <List.Meta>
        <QueueStatusPill status={status} />
      </List.Meta>
    </List.Row>
  );
}
