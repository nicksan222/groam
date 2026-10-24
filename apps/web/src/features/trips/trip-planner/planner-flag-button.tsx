import { Flag } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { testIds } from '@/lib/test-ids';
import type { IssueFlagTarget } from '@/types/issues';

/**
 * A quiet "Flag" control for a plan card (a `group/entry`). It is always there: faint on devices
 * that can hover, full strength on hover or focus of the card, and full with a 32px hit area on
 * touch.
 */
export function PlannerFlagButton({
  onFlag,
  target
}: {
  onFlag: (target: IssueFlagTarget) => void;
  target: IssueFlagTarget;
}) {
  return (
    <Button
      aria-label={`Flag ${target.label}`}
      className="-mr-1 -mt-1 shrink-0 text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 pointer-coarse:size-8 [@media(hover:hover)]:opacity-40 [@media(hover:hover)]:group-focus-within/entry:opacity-100 [@media(hover:hover)]:group-hover/entry:opacity-100"
      data-testid={testIds.planFlag}
      onClick={() => onFlag(target)}
      size="icon-xs"
      title="Flag"
      variant="ghost"
    >
      <Flag />
    </Button>
  );
}
