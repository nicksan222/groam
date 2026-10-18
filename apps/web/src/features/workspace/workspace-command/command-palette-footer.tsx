import { Kbd } from '@groam/ui/components/kbd';
import { ArrowDown, ArrowUp, CornerDownLeft } from 'lucide-react';

export function CommandPaletteFooter({ count }: { count: number }) {
  return (
    <div className="flex h-9 items-center gap-4 border-t bg-muted/40 px-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <Kbd aria-label="Up">
          <ArrowUp />
        </Kbd>
        <Kbd aria-label="Down">
          <ArrowDown />
        </Kbd>
        Navigate
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd aria-label="Enter">
          <CornerDownLeft />
        </Kbd>
        Open
      </span>
      <span className="flex items-center gap-1.5 max-sm:hidden">
        <Kbd>Esc</Kbd>
        Close
      </span>
      <span aria-live="polite" className="ml-auto tabular-nums">
        {count === 1 ? '1 result' : `${count} results`}
      </span>
    </div>
  );
}
