import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';

/** One option: a radio or checkbox row with its share of votes drawn behind the label. */
export function PollOptionButton({
  count,
  disabled,
  label,
  multiSelect,
  onToggle,
  selected,
  share
}: {
  count: number;
  disabled: boolean;
  label: string;
  multiSelect: boolean;
  onToggle: () => void;
  selected: boolean;
  /** 0–1 of the votes cast. */
  share: number;
}) {
  return (
    <Button
      aria-checked={selected}
      className={cn(
        'relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
        disabled && 'cursor-default hover:bg-transparent'
      )}
      data-testid={testIds.pollOption}
      disabled={disabled}
      onClick={onToggle}
      role={multiSelect ? 'checkbox' : 'radio'}
      type="button"
      unstyled
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary/10 transition-[width]"
        style={{ width: `${Math.round(share * 100)}%` }}
      />
      <span className="relative min-w-0 truncate font-medium text-foreground">{label}</span>
      <span className="relative text-xs text-muted-foreground tabular-nums">{count}</span>
    </Button>
  );
}
