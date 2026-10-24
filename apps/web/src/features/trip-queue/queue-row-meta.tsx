import { GitBranch } from '@groam/icons';
import { List } from '@groam/ui/components/list';
import type { QueueItem } from '@/types/queue';
import { QueueMandatoryFlag } from './queue-mandatory-flag';

/** The right-hand facts that only fit on a wide row: the mandatory flag and the idea an issue started. */
export function QueueRowMeta({ item }: { item: QueueItem }) {
  if (!item.mandatory && !item.ideaTitle) return null;
  return (
    <List.Meta>
      {item.mandatory ? <QueueMandatoryFlag /> : null}
      {item.ideaTitle ? (
        <span
          className="inline-flex h-5 max-w-44 items-center gap-1 rounded-[5px] border border-border px-2 text-xs text-muted-foreground"
          data-slot="queue-idea"
          title={`Started idea: ${item.ideaTitle}`}
        >
          <GitBranch aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{item.ideaTitle}</span>
        </span>
      ) : null}
    </List.Meta>
  );
}
