import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { Check, Trash2 } from 'lucide-react';
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
      className={cn('flex items-center gap-2', entering && 'packing-slide-in')}
      data-entering={entering ? 'true' : undefined}
      data-packed={item.packed ? 'true' : 'false'}
      data-testid={testIds.tripPackingPersonalItem}
    >
      <Button
        aria-checked={item.packed}
        aria-label={item.label}
        data-testid={testIds.tripPackingPersonalToggle}
        disabled={readOnly}
        onClick={() => void run(() => onTogglePacked(item.id, !item.packed))}
        role="checkbox"
        className="pointer-coarse:size-11"
        size="icon-sm"
        type="button"
        variant={item.packed ? 'default' : 'outline'}
      >
        {item.packed ? <Check className={cn(toggled && 'packing-check-draw')} /> : null}
      </Button>
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
      {readOnly ? null : (
        <Button
          aria-label={`Remove ${item.label} from my list`}
          data-testid={testIds.tripPackingPersonalRemove}
          disabled={pending}
          onClick={() => void run(() => onRemove(item))}
          className="pointer-coarse:size-9"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}
