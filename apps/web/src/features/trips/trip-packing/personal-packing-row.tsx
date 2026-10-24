import { Check, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List } from '@groam/ui/components/list';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';
import type { PersonalPackingItem } from '@/types/packing';
import { useChanged, usePendingWrite } from './use-packing-motion';

/** One line of the viewer's private list: a tick, the label, and remove. */
export function PersonalPackingRow({
  entering = false,
  item,
  onRemove,
  onTogglePacked,
  readOnly
}: {
  /** The row was added after the list loaded, so it slides in. */
  entering?: boolean;
  item: PersonalPackingItem;
  onRemove: (item: PersonalPackingItem) => void | Promise<unknown>;
  onTogglePacked: (itemId: PersonalPackingItem['id'], packed: boolean) => void | Promise<unknown>;
  readOnly: boolean;
}) {
  const toggled = useChanged(item.packed);
  const { pending, run } = usePendingWrite();
  return (
    <List.Row
      aria-busy={pending || undefined}
      className={entering ? 'packing-slide-in' : undefined}
      data-entering={entering ? 'true' : undefined}
      data-packed={item.packed ? 'true' : 'false'}
      data-testid={testIds.tripPackingPersonalItem}
    >
      <List.Main>
        <List.Title asChild muted={item.packed}>
          <Button
            aria-checked={item.packed}
            aria-label={item.label}
            data-testid={testIds.tripPackingPersonalToggle}
            disabled={readOnly}
            onClick={() => void run(() => onTogglePacked(item.id, !item.packed))}
            role="checkbox"
            type="button"
            unstyled
          >
            <span
              aria-hidden
              className={cn(
                'mr-3 inline-grid size-4 place-items-center rounded-[5px] border align-middle transition-colors duration-150 ease-out motion-reduce:transition-none',
                item.packed
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background group-hover/row:border-muted-foreground/60'
              )}
            >
              {item.packed ? (
                <Check className={cn('size-3', toggled && 'packing-check-draw')} strokeWidth={3} />
              ) : null}
            </span>
            <span
              className={cn(
                'break-words line-through transition-colors duration-200 ease-out motion-reduce:transition-none',
                item.packed ? 'decoration-muted-foreground' : 'decoration-transparent'
              )}
            >
              {item.label}
            </span>
          </Button>
        </List.Title>
      </List.Main>
      {readOnly ? null : (
        <List.Actions>
          <Button
            aria-label={`Remove ${item.label} from my list`}
            className="text-muted-foreground opacity-0 group-hover/row:opacity-100 group-has-focus-visible/row:opacity-100 hover:text-destructive focus-visible:opacity-100 pointer-coarse:size-9 pointer-coarse:opacity-100"
            data-testid={testIds.tripPackingPersonalRemove}
            disabled={pending}
            onClick={() => void run(() => onRemove(item))}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </List.Actions>
      )}
    </List.Row>
  );
}
