import type { DataTableResourceLabel } from '#src/lib/data-table';

/** "2 of 9 issues": matches out of all rows, with the noun in the right number. */
export function listSearchCountText(
  { shown, total }: { shown: number; total: number },
  noun: DataTableResourceLabel
) {
  return `${shown} of ${total} ${total === 1 ? noun.singular : noun.plural}`;
}
