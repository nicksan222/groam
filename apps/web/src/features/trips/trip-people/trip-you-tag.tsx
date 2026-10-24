import { cn } from '@groam/ui/lib/utils';

/** The small "You" tag beside the viewer's name; on the primary wash it sits on a lighter chip. */
export function TripYouTag({ onWash = false }: { onWash?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-[18px] shrink-0 items-center rounded-sm px-2 text-[11px] text-muted-foreground',
        onWash ? 'bg-background/60 ring-1 ring-border' : 'bg-muted'
      )}
    >
      You
    </span>
  );
}
