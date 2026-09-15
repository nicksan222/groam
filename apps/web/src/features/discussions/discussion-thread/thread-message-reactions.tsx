import { BubbleReactions } from '@groam/ui/components/bubble';
import { cn } from '@groam/ui/lib/utils';
import type { ThreadReactionStamp } from './thread-message-stamps';

export function ThreadMessageReactions({
  mine,
  onReact,
  stamps
}: {
  mine: boolean;
  onReact: (emoji: string) => void;
  stamps: ThreadReactionStamp[];
}) {
  if (stamps.length === 0) return null;

  return (
    <BubbleReactions
      align={mine ? 'end' : 'start'}
      className="gap-1 bg-transparent p-0 ring-0"
      side="bottom"
    >
      {stamps.map((stamp) => (
        <button
          aria-label={`${stamp.label}${stamp.count > 1 ? `, ${stamp.count}` : ''}`}
          aria-pressed={stamp.mine}
          className={cn(
            'inline-flex h-6 min-w-6 items-center gap-1 rounded-full border bg-popover px-1.5 text-[11px] leading-none shadow-xs',
            'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            stamp.mine
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border/70 text-foreground'
          )}
          key={stamp.emoji}
          onClick={() => onReact(stamp.emoji)}
          type="button"
        >
          <span aria-hidden="true">{stamp.emoji}</span>
          {stamp.count > 1 ? (
            <span className="font-medium tabular-nums text-muted-foreground">{stamp.count}</span>
          ) : null}
        </button>
      ))}
    </BubbleReactions>
  );
}
