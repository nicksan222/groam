import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { Link } from '@/features/workspace/navigation/router';
import type { QueueItem } from '@/types/queue';

/** A row's title: a link to the issue or idea, or the button that opens a poll in place. */
export function QueueRowTitle({
  expanded,
  item,
  onFocus,
  onToggle
}: {
  expanded: boolean;
  item: QueueItem;
  /** The keyboard cursor follows focus onto the title. */
  onFocus?: () => void;
  onToggle: () => void;
}) {
  if (item.kind !== 'poll') {
    return (
      <List.Title asChild muted={item.settled}>
        <Link data-slot="queue-title" onFocus={onFocus} title={item.title} {...item.href}>
          {item.title}
        </Link>
      </List.Title>
    );
  }
  return (
    <List.Title asChild muted={item.settled}>
      <Button
        aria-expanded={expanded}
        data-slot="queue-title"
        onClick={onToggle}
        onFocus={onFocus}
        type="button"
        unstyled
      >
        {item.title}
      </Button>
    </List.Title>
  );
}
