const VISIBLE_SLOTS = 6;

/**
 * One dashed seat per piece still missing, so "needs 4" reads at a glance. Decorative: the
 * coverage badge carries the count for screen readers.
 */
export function PackingOpenSlots({ missing }: { missing: number }) {
  if (missing <= 0) return null;
  const shown = Math.min(missing, VISIBLE_SLOTS);
  return (
    <span aria-hidden className="inline-flex shrink-0 items-center gap-1" data-slot="open-slots">
      {Array.from({ length: shown }, (_, index) => (
        <span
          className="size-5 rounded-full border border-dashed border-muted-foreground/50"
          key={`slot-${index}`}
        />
      ))}
      {missing > shown ? (
        <span className="text-xs text-muted-foreground tabular-nums">+{missing - shown}</span>
      ) : null}
    </span>
  );
}
