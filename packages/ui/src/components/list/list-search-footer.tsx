import { ArrowDown, ArrowUp, CornerDownLeft } from '@groam/icons';
import { Kbd } from '@groam/ui/components/kbd';
import { COMMAND_FOOTER_CLASS_NAME } from '@groam/ui/lib/command-surface';
import { cn } from '@groam/ui/lib/utils';
import type { DataTableResourceLabel } from '#src/lib/data-table';

/** "2 of 9 issues": matches out of all rows, with the noun in the right number. */
export function listSearchCountText(
  { shown, total }: { shown: number; total: number },
  noun: DataTableResourceLabel
) {
  return `${shown} of ${total} ${total === 1 ? noun.singular : noun.plural}`;
}

/**
 * The dialog's key hints, as text with small key caps: which keys do something right now, and on
 * the right how many rows match. Hidden on phones, which have the Done button instead.
 */
export function ListSearchFooter({
  count,
  navigates,
  noun,
  tabCompletes
}: {
  count?: { shown: number; total: number };
  /** Suggestions are showing, so the arrows move between them. */
  navigates: boolean;
  noun: DataTableResourceLabel;
  tabCompletes: boolean;
}) {
  return (
    <div className={cn(COMMAND_FOOTER_CLASS_NAME, 'max-sm:hidden')} data-slot="list-search-footer">
      {navigates ? (
        <span className="flex items-center gap-2">
          <Kbd aria-label="Up">
            <ArrowUp />
          </Kbd>
          <Kbd aria-label="Down">
            <ArrowDown />
          </Kbd>
          navigate
        </span>
      ) : null}
      {tabCompletes ? (
        <span className="flex items-center gap-2">
          <Kbd>Tab</Kbd>
          complete
        </span>
      ) : null}
      <span className="flex items-center gap-2">
        <Kbd aria-label="Enter">
          <CornerDownLeft />
        </Kbd>
        /<Kbd>Esc</Kbd>
        done
      </span>
      {count ? (
        <span aria-live="polite" className="ml-auto tabular-nums" data-slot="list-search-count">
          {listSearchCountText(count, noun)}
        </span>
      ) : null}
    </div>
  );
}
