import { ListFilter, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import type { DataTableResourceLabel } from '#src/lib/data-table';
import { listSearchCountText } from './list-search-count';
import { segmentListSearch, type ListSearchToken } from './list-search-query';

/** The words of a query with where each starts, a key that stays put while later words change. */
function positionedTokens(query: string, keys: readonly string[]) {
  let offset = 0;
  const tokens: { start: number; token: ListSearchToken }[] = [];
  for (const segment of segmentListSearch(query, keys)) {
    if (segment.kind !== 'space') tokens.push({ start: offset, token: segment });
    offset += segment.raw.length;
  }
  return tokens;
}

/**
 * The full-width bar above a filtered list: the query as tokens (a recognised key:value is a chip,
 * key muted and value medium) and free text, "N of M issues", and Clear.
 */
export function ListSearchBar({
  count,
  keys,
  label,
  noun,
  onClear,
  onEdit,
  query
}: {
  count?: { shown: number; total: number };
  keys: readonly string[];
  label: string;
  noun: DataTableResourceLabel;
  onClear: () => void;
  onEdit: () => void;
  query: string;
}) {
  return (
    <section
      aria-label={label}
      className="flex min-w-0 flex-wrap items-center gap-2"
      data-slot="list-toolbar"
    >
      <span
        className="flex h-9 w-full min-w-0 items-center rounded-lg border border-input bg-background text-sm shadow-xs max-md:h-11"
        data-slot="list-search-bar"
      >
        <Button
          aria-label="Edit filter"
          className="flex h-full min-w-0 flex-1 cursor-text items-center justify-start gap-2 rounded-l-lg px-3 text-left font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onEdit}
          unstyled
        >
          <ListFilter aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            {positionedTokens(query, keys).map(({ start, token }) => {
              const id = `${start}:${token.raw}`;
              if (token.kind === 'text') {
                return (
                  <span className="truncate text-foreground" key={id}>
                    {token.raw}
                  </span>
                );
              }
              const colon = token.raw.indexOf(':') + 1;
              return (
                <span
                  className="inline-flex h-6 shrink-0 items-center rounded-sm bg-muted px-2"
                  data-slot="list-search-chip"
                  key={id}
                >
                  <span className="text-muted-foreground">{token.raw.slice(0, colon)}</span>
                  <span className="font-medium text-foreground">{token.raw.slice(colon)}</span>
                </span>
              );
            })}
          </span>
        </Button>
        {count ? (
          <span
            aria-live="polite"
            className="shrink-0 px-3 text-xs text-muted-foreground tabular-nums"
            data-slot="list-search-count"
          >
            {listSearchCountText(count, noun)}
          </span>
        ) : null}
        <Button
          aria-label="Clear filter"
          className="flex h-full w-9 shrink-0 cursor-pointer items-center justify-center rounded-r-lg border-l border-input text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-md:w-11"
          onClick={onClear}
          unstyled
        >
          <X aria-hidden className="size-4" />
        </Button>
      </span>
    </section>
  );
}
