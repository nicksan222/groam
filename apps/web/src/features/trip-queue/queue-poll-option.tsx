import { Check } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { cn } from '@groam/ui/lib/utils';
import { testIds } from '@/lib/test-ids';

/**
 * One option of an expanded poll: a 40px row with a radio or checkbox, the label, and the count
 * and share at the right, over a quiet fill that shows the share. Read-only rows (closed poll,
 * archived trip, a viewer who cannot vote) take no hover.
 */
export function QueuePollOption({
  count,
  disabled,
  label,
  leading,
  multiSelect,
  onToggle,
  pending,
  selected,
  share,
  winner
}: {
  count: number;
  disabled: boolean;
  label: string;
  /** Holds the most votes so far. */
  leading: boolean;
  multiSelect: boolean;
  onToggle: () => void;
  /** A vote is saving. */
  pending: boolean;
  selected: boolean;
  /** 0–1 of the votes cast. */
  share: number;
  /** The poll is closed and this option won. */
  winner: boolean;
}) {
  const percent = Math.round(share * 100);
  return (
    <Button
      aria-checked={selected}
      className={cn(
        'relative flex h-10 w-full items-center gap-3 overflow-hidden rounded-lg border px-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected ? 'border-primary bg-primary/5' : 'border-border',
        !disabled && 'cursor-pointer hover:bg-muted',
        disabled && 'cursor-default',
        pending && 'cursor-progress'
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
        style={{ width: `${percent}%` }}
      />
      <span
        aria-hidden
        className={cn(
          'relative grid size-[18px] shrink-0 place-items-center border-[1.5px]',
          multiSelect ? 'rounded-[5px]' : 'rounded-full',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
        )}
      >
        {selected ? (
          multiSelect ? (
            <Check className="size-3" />
          ) : (
            <span className="size-1.5 rounded-full bg-primary-foreground" />
          )
        ) : null}
      </span>
      <span className="relative min-w-0 flex-1 truncate text-foreground">{label}</span>
      {winner ? <span className="relative text-xs font-medium text-success">Winner</span> : null}
      <span
        className={cn(
          'relative text-xs tabular-nums text-muted-foreground',
          leading && 'font-semibold text-foreground'
        )}
      >
        {count === 0 ? '0' : `${count} · ${percent}%`}
      </span>
    </Button>
  );
}
