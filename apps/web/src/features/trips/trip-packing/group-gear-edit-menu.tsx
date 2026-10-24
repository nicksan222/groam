import { MoreHorizontal } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@groam/ui/components/popover';
import type { ReactNode } from 'react';

/** Commits a focused field before the popover closes, since an unmounted input never blurs. */
function blurFocused() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}

/**
 * The "⋯" beside a gear item in an idea: renaming, the needed count, who brings how many, and
 * removing live here so the list itself stays one quiet line per item.
 */
export function GroupGearEditMenu({
  children,
  itemLabel
}: {
  children: ReactNode;
  itemLabel: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={`Edit ${itemLabel}`}
          className="text-muted-foreground pointer-coarse:size-9"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={`Edit ${itemLabel}`}
        className="w-80 p-3"
        data-gear-hold
        onPointerDownOutside={blurFocused}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
