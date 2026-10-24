import { ListFilter } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@groam/ui/components/dialog';
import { Kbd } from '@groam/ui/components/kbd';
import {
  COMMAND_DIALOG_CLASS_NAME,
  COMMAND_INPUT_ROW_CLASS_NAME
} from '@groam/ui/lib/command-surface';
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useState
} from 'react';
import { useDebouncedDraft } from '#src/hooks/use-debounced-draft';
import { dataTableFilterLabels, type DataTableResourceLabel } from '#src/lib/data-table';
import { ListSearchBar } from './list-search-bar';
import { ListSearchFooter } from './list-search-footer';
import { ListSearchHints, LIST_SEARCH_TEXT_INSET } from './list-search-hints';
import { ListSearchInput } from './list-search-input';
import {
  applyListSearchSuggestion,
  type ListSearchFacet,
  listSearchLastWord,
  listSearchSuggestions
} from './list-search-query';
import { useListDialogFocus } from './use-list-dialog-focus';
import { useListSearchShortcut } from './use-list-search-shortcut';

/** What ArrowDown and ArrowUp add to the highlighted hint. */
const arrowSteps: Partial<Record<string, number>> = { ArrowDown: 1, ArrowUp: -1 };

/** How long typing pauses before the list narrows; the input itself never lags. */
const searchDebounceMs = 200;

/** What a key does in the input: move the highlight, apply it, close, or nothing (default). */
function keyAction(
  event: ReactKeyboardEvent<HTMLInputElement>,
  state: { applies: boolean; hasHints: boolean; tabCompletes: boolean }
) {
  if (arrowSteps[event.key] !== undefined) return state.hasHints ? 'arrow' : null;
  if (event.key === 'Tab') return !event.shiftKey && state.tabCompletes ? 'pick' : null;
  if (event.key === 'Enter') return state.applies ? 'pick' : 'close';
  return null;
}

/** The line under the input when nothing is suggested: what the text matches, and the keys. */
function noSuggestionsText(keys: readonly string[]) {
  if (keys.length === 0) return 'Matching titles.';
  const named = keys.map((key) => `${key}:`);
  const list =
    named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} or ${named.at(-1)}`;
  return `Matching titles. Try ${list} to filter.`;
}

/**
 * The list's filter: press K (or any control that sets `open`, such as a `K filter` footer hint or
 * a phone's header button) to open a dialog styled like the Ctrl+K palette. The input never lags;
 * the list narrows once typing pauses (`useDebouncedDraft`), and Enter or Esc closes the dialog
 * and commits at once. Give it `facets` and the input also takes `key:value` filters
 * (`assignee:me`), coloured as you type, with hints under it: examples when empty, keys once two
 * letters are typed, values after the colon. The first hint is highlighted; ↑ ↓ move, Tab
 * completes it while a word is started, and Enter applies it once the highlight was moved or a
 * word is started (otherwise, or when the word is already complete, it closes). The feature parses the string with `parseListSearch` and
 * filters itself. While the query is not empty, a full-width bar shows it above the rows (tap to
 * edit, ✕ to clear) with an optional `count` of matches. Mount it once per list; it owns the K key.
 */
const noFacets: readonly ListSearchFacet[] = [];

function ListSearch({
  count,
  facets = noFacets,
  noun,
  onOpenChange,
  onQueryChange,
  open,
  placeholder,
  query
}: {
  /** Rows that match out of all rows, shown on the bar and in the dialog as "N of M issues". */
  count?: { shown: number; total: number };
  facets?: readonly ListSearchFacet[];
  noun: DataTableResourceLabel;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  open: boolean;
  placeholder?: string;
  query: string;
}) {
  const focus = useListDialogFocus();
  const labels = dataTableFilterLabels(noun, { filterPlaceholderPrefix: 'Filter' });
  const needle = query.trim();
  const baseId = useId();
  const listId = `${baseId}-hints`;
  const optionId = (index: number) => `${baseId}-hint-${index}`;
  // The parent stores each commit verbatim, so the draft and the committed query stay equal.
  const { change, draft, flush } = useDebouncedDraft({
    delay: searchDebounceMs,
    onCommit: onQueryChange,
    value: query
  });
  const keys = useMemo(() => facets.map((facet) => facet.key), [facets]);
  const suggestions = useMemo(() => listSearchSuggestions(draft, facets), [draft, facets]);
  // -1 until the user moves or hovers; then the first hint is the highlight, as in the palette.
  const [picked, setPicked] = useState(-1);
  const hasHints = suggestions.length > 0;
  const moved = hasHints && picked >= 0 && picked < suggestions.length;
  const highlight = moved ? picked : hasHints ? 0 : -1;
  const wordStarted = listSearchLastWord(draft) !== '';
  const tabCompletes = hasHints && wordStarted;
  // The word already is the highlighted hint, so there is nothing left to complete.
  const typedInFull =
    hasHints &&
    suggestions[highlight]?.insert.trim().toLocaleLowerCase() ===
      listSearchLastWord(draft).toLocaleLowerCase();
  const pick = (index: number) => {
    const suggestion = suggestions[index];
    if (!suggestion) return false;
    flush(applyListSearchSuggestion(draft, suggestion));
    setPicked(-1);
    return true;
  };
  const close = () => {
    flush(draft);
    setPicked(-1);
    onOpenChange(false);
  };
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const applies = hasHints && (moved || wordStarted) && !typedInFull;
    const action = keyAction(event, { applies, hasHints, tabCompletes });
    if (!action) return;
    event.preventDefault();
    if (action === 'pick') pick(highlight);
    else if (action === 'close') close();
    else
      setPicked(
        (highlight + (arrowSteps[event.key] ?? 0) + suggestions.length) % suggestions.length
      );
  };

  useEffect(() => {
    if (moved)
      document.getElementById(`${baseId}-hint-${picked}`)?.scrollIntoView({ block: 'nearest' });
  }, [baseId, moved, picked]);

  useListSearchShortcut(() => onOpenChange(true));

  return (
    <>
      {needle ? (
        <ListSearchBar
          count={count}
          keys={keys}
          label={labels.toolbarAriaLabel}
          noun={noun}
          onClear={() => onQueryChange('')}
          onEdit={() => onOpenChange(true)}
          query={needle}
        />
      ) : null}
      <Dialog onOpenChange={(next) => (next ? onOpenChange(true) : close())} open={open}>
        <DialogContent
          {...focus}
          className={COMMAND_DIALOG_CLASS_NAME}
          data-slot="list-search"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">{labels.filterAriaLabel}</DialogTitle>
          <DialogDescription className="sr-only">
            Narrows the list as you type. Press Enter to close.
          </DialogDescription>
          <div className={COMMAND_INPUT_ROW_CLASS_NAME}>
            <ListFilter aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <ListSearchInput
              aria-activedescendant={highlight >= 0 ? optionId(highlight) : undefined}
              aria-autocomplete="list"
              aria-controls={hasHints ? listId : undefined}
              aria-expanded={hasHints}
              aria-label={labels.filterAriaLabel}
              autoComplete="off"
              autoFocus
              keys={keys}
              onChange={(event) => {
                setPicked(-1);
                change(event.target.value);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={placeholder ?? labels.filterPlaceholder}
              role="combobox"
              spellCheck={false}
              type="text"
              value={draft}
            />
            <Kbd className="max-sm:hidden">Esc</Kbd>
            <Button className="-mr-2 sm:hidden" onClick={close} size="sm" variant="ghost">
              Done
            </Button>
          </div>
          <div
            aria-label={hasHints ? 'Filter hints' : undefined}
            className="max-h-[min(22rem,50vh)] min-h-[9.5rem] overflow-y-auto overscroll-contain pb-2"
            data-slot="list-search-hints"
            id={hasHints ? listId : undefined}
            role={hasHints ? 'listbox' : undefined}
          >
            {hasHints ? (
              <ListSearchHints
                baseId={baseId}
                highlight={highlight}
                onHover={setPicked}
                onPick={pick}
                suggestions={suggestions}
                tabCompletes={tabCompletes}
              />
            ) : (
              <p
                className={`pt-3 pr-4 text-sm text-muted-foreground ${LIST_SEARCH_TEXT_INSET}`}
                data-slot="list-search-empty"
              >
                {noSuggestionsText(keys)}
              </p>
            )}
          </div>
          <ListSearchFooter
            count={count}
            navigates={hasHints}
            noun={noun}
            tabCompletes={tabCompletes}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export { ListSearch };
