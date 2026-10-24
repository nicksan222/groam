import { List, type ListHint } from '@groam/ui/components/list';
import type { ReactNode } from 'react';
import { focusAddQuestion } from '@/features/trip-queue/hooks/use-queue-keys';
import type { QueueKind } from '@/types/queue';

/** The shared bottom controls, with optional desktop keyboard hints before Sort and Filter. */
export function QueueShortcutFooter({
  addable,
  archived,
  kind,
  onOpenSearch,
  selectable,
  sort
}: {
  /** Whether C may focus the add-question input. */
  addable: boolean;
  archived: boolean;
  kind: QueueKind;
  onOpenSearch: () => void;
  selectable: boolean;
  sort: ReactNode;
}) {
  const hints: ListHint[] = [
    ...(archived
      ? []
      : [
          { keys: '↑ ↓', label: 'move' },
          ...(selectable ? [{ keys: 'X', label: 'select' }] : []),
          { keys: '↵', label: 'open' }
        ]),
    ...(kind === 'issue' && addable ? [{ keys: 'C', label: 'new', onClick: focusAddQuestion }] : [])
  ];
  return (
    <List.Footer aria-label="Keyboard shortcuts" desktopOnly>
      <List.Hints desktopOnly hints={hints} />
      <List.Controls>
        {sort}
        <List.SearchTrigger onClick={onOpenSearch} />
      </List.Controls>
    </List.Footer>
  );
}
