import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { Check, X } from 'lucide-react';
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
    <li
      aria-busy={pending || undefined}
      className={cn(
        'group/row relative flex items-center rounded-lg transition-colors duration-150 ease-out hover:bg-muted/70 has-focus-visible:bg-muted/70 motion-reduce:transition-none',
        entering && 'packing-slide-in'
      )}
      data-entering={entering ? 'true' : undefined}
      data-packed={item.packed ? 'true' : 'false'}
      data-testid={testIds.tripPackingPersonalItem}
    >
      <Button
        aria-checked={item.packed}
        aria-label={item.label}
        className="h-auto min-h-9 min-w-0 flex-1 justify-start gap-3 border-0 py-1.5 pr-1 pl-2 text-left font-normal whitespace-normal hover:bg-transparent disabled:opacity-100 pointer-coarse:min-h-11"
        data-testid={testIds.tripPackingPersonalToggle}
        disabled={readOnly}
        onClick={() => void run(() => onTogglePacked(item.id, !item.packed))}
        role="checkbox"
        type="button"
        variant="ghost"
      >
        <span
          aria-hidden
          className={cn(
            'grid size-4 shrink-0 place-items-center rounded-[5px] border transition-colors duration-150 ease-out motion-reduce:transition-none',
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
            'min-w-0 flex-1 text-sm break-words line-through transition-colors duration-200 ease-out motion-reduce:transition-none',
            item.packed
              ? 'text-muted-foreground decoration-muted-foreground'
              : 'decoration-transparent'
          )}
        >
          {item.label}
        </span>
      </Button>
      {readOnly ? null : (
        <Button
          aria-label={`Remove ${item.label} from my list`}
          className="mr-1 text-muted-foreground opacity-0 group-hover/row:opacity-100 group-has-focus-visible/row:opacity-100 hover:text-destructive focus-visible:opacity-100 pointer-coarse:size-9 pointer-coarse:opacity-100"
          data-testid={testIds.tripPackingPersonalRemove}
          disabled={pending}
          onClick={() => void run(() => onRemove(item))}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
      )}
    </li>
  );
}
