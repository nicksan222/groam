import { ArrowDown, ArrowUp, CornerDownLeft } from '@groam/icons';
import { Kbd } from '@groam/ui/components/kbd';
import { COMMAND_FOOTER_CLASS_NAME } from '@groam/ui/lib/command-surface';

export function CommandPaletteFooter({ count }: { count: number }) {
  return (
    <div className={COMMAND_FOOTER_CLASS_NAME}>
      <span className="flex items-center gap-2">
        <Kbd aria-label="Up">
          <ArrowUp />
        </Kbd>
        <Kbd aria-label="Down">
          <ArrowDown />
        </Kbd>
        Navigate
      </span>
      <span className="flex items-center gap-2">
        <Kbd aria-label="Enter">
          <CornerDownLeft />
        </Kbd>
        Open
      </span>
      <span className="flex items-center gap-2 max-sm:hidden">
        <Kbd>Esc</Kbd>
        Close
      </span>
      <span aria-live="polite" className="ml-auto tabular-nums">
        {count === 1 ? '1 result' : `${count} results`}
      </span>
    </div>
  );
}
