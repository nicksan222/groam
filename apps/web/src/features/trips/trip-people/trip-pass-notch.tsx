import { cn } from '@groam/ui/lib/utils';

/** The surface a notch is cut from; a notch is drawn in the colour of what sits behind the pass. */
const SURFACES = { background: 'bg-background', popover: 'bg-popover' } as const;

/**
 * One half-circle notch of a boarding-pass divider. Place it on the dashed divider's end with a
 * position class; its parent is `relative` and clips (`overflow-hidden`), so only the half inside
 * shows. `surface` is the colour behind the pass: the page for Your pass, the popover for a card.
 */
export function TripPassNotch({
  className,
  surface
}: {
  className: string;
  surface: keyof typeof SURFACES;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'absolute size-4 rounded-full border border-border',
        SURFACES[surface],
        className
      )}
    />
  );
}
