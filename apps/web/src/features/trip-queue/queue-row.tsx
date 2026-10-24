import { List } from '@groam/ui/components/list';
import { useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { QueueItem, QueueRowLedger } from '@/types/queue';
import { compactAge } from './queue-age';
import { QueueAvatar } from './queue-avatar';
import { QueueDueText } from './queue-due-text';
import { QueueMandatoryFlag } from './queue-mandatory-flag';
import { pollLeader } from './queue-poll-leader';
import { QueuePollLedger } from './queue-poll-ledger';
import { QueueRowMeta } from './queue-row-meta';
import { QueueRowTitle } from './queue-row-title';
import { QueueStatusIcon } from './queue-status-icon';

const avatarLabel = { idea: 'Author', issue: 'Assignee', poll: 'Asked by' } as const;

/**
 * One row of the queue. The title sits over a muted excerpt, and the status glyph and the right
 * hand facts (flag, idea, due, avatar, age) line up with the title's first line. The title
 * stretches over the whole row, so a click anywhere opens the item, or the poll in place. The first
 * column holds the selection checkbox; the keyboard cursor and selection tint the row on wide
 * screens. On a phone the due date moves to the excerpt line and the rest of the facts drop away.
 */
export function QueueRow({
  archived,
  item,
  ledger
}: {
  archived: boolean;
  item: QueueItem;
  ledger?: QueueRowLedger;
}) {
  const [ownExpanded, setOwnExpanded] = useState(false);
  const expanded = ledger ? ledger.expanded : ownExpanded;
  const label = `${avatarLabel[item.kind]}: ${item.person?.name ?? 'nobody'}`;
  return (
    <List.Row
      attention={item.yourTurn}
      cursor={ledger?.cursor}
      data-kind={item.kind}
      data-row-id={item.id}
      data-testid={testIds.queueRow}
      data-title={item.title}
      data-your-turn={item.yourTurn || undefined}
      selected={ledger?.selected}
    >
      <List.Leading>
        {ledger?.onToggleSelect ? (
          <List.Checkbox
            alwaysShown={ledger.anySelected || ledger.cursor}
            label={`Select ${item.title}`}
            onToggle={ledger.onToggleSelect}
            selected={ledger.selected}
          />
        ) : null}
      </List.Leading>
      <List.Icon>
        <QueueStatusIcon item={item} />
      </List.Icon>
      <List.Main>
        {item.yourTurn ? <span className="sr-only">Your turn. </span> : null}
        <QueueRowTitle
          expanded={expanded}
          item={item}
          onFocus={ledger?.onCursor}
          onToggle={ledger ? ledger.onToggleExpanded : () => setOwnExpanded((open) => !open)}
        />
        {item.mandatory ? (
          <List.Inline>
            <QueueMandatoryFlag />
          </List.Inline>
        ) : null}
        {item.dueAt === undefined ? null : (
          <List.Aside>
            <QueueDueText dueAt={item.dueAt} kind={item.kind} />
          </List.Aside>
        )}
        <List.Description>
          {item.kind === 'poll' ? pollLeader(item.poll) : item.excerpt}
        </List.Description>
      </List.Main>
      <QueueRowMeta item={item} />
      <List.Avatar>
        <QueueAvatar label={label} person={item.person} />
      </List.Avatar>
      <List.Age>
        <time
          dateTime={new Date(item.updatedAt).toISOString()}
          title={`Updated ${new Date(item.updatedAt).toLocaleString()}`}
        >
          {compactAge(item.updatedAt)}
        </time>
      </List.Age>
      {item.kind === 'poll' && expanded ? (
        <List.Expanded>
          <QueuePollLedger archived={archived} poll={item.poll} />
        </List.Expanded>
      ) : null}
    </List.Row>
  );
}
