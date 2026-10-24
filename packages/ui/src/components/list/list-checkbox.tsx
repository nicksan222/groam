import { Check } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { cn } from '#src/lib/utils';

/**
 * A row's selection checkbox, for `List.Leading`. It shows on row hover, on focus, and when
 * `alwaysShown` (the cursor row, or any row once something is selected).
 */
function ListCheckbox({
  alwaysShown = false,
  label,
  onToggle,
  selected
}: {
  alwaysShown?: boolean;
  label: string;
  onToggle: () => void;
  selected: boolean;
}) {
  return (
    <Button
      aria-checked={selected}
      aria-label={label}
      className={cn(
        'relative z-10 grid size-[15px] cursor-pointer place-items-center rounded-[4px] border-[1.5px] border-input transition-opacity outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover/row:opacity-100',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-background',
        alwaysShown || selected ? 'opacity-100' : 'opacity-0'
      )}
      data-slot="list-checkbox"
      onClick={onToggle}
      role="checkbox"
      type="button"
      unstyled
    >
      {selected ? <Check aria-hidden className="size-3" /> : null}
    </Button>
  );
}

export { ListCheckbox };
