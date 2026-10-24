import { Search, SearchX } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { Input } from '@groam/ui/components/input';
import { Kbd } from '@groam/ui/components/kbd';
import {
  COMMAND_DIALOG_CLASS_NAME,
  COMMAND_GROUP_HEADING_CLASS_NAME,
  COMMAND_INPUT_CLASS_NAME,
  COMMAND_INPUT_ROW_CLASS_NAME
} from '@groam/ui/lib/command-surface';
import { type ReactNode, useCallback, useId, useRef } from 'react';
import type { CommandPaletteMatch } from '@/features/workspace/hooks/command-palette-results';
import { useCommandPalette } from '@/features/workspace/hooks/use-command-palette';
import { testIds } from '@/lib/test-ids';
import { CommandPaletteFooter } from './command-palette-footer';
import { CommandPaletteOption } from './command-palette-option';

export function CommandPalette() {
  const {
    activeIndex,
    canLoadMore,
    go,
    isLoadingMore,
    loadMore,
    onInputKeyDown,
    onOpenChange,
    open,
    query,
    results,
    setActiveIndex,
    setQuery
  } = useCommandPalette();
  const searchRef = useRef<HTMLInputElement>(null);
  // Exhausting the results removes the focused button; hand focus back to the search field.
  const returnFocusToSearch = useCallback(
    (button: HTMLButtonElement | null) => () => {
      if (button === document.activeElement) searchRef.current?.focus();
    },
    []
  );
  const loadMoreButton = (
    <div className="flex justify-center pt-1">
      <Button
        onClick={loadMore}
        pending={isLoadingMore}
        ref={returnFocusToSearch}
        size="sm"
        variant="ghost"
      >
        Load more
      </Button>
    </div>
  );
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={COMMAND_DIALOG_CLASS_NAME}
        data-testid={testIds.commandPalette}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Jump to</DialogTitle>
          <DialogDescription>
            Go to a section of this trip, search its ideas, issues, and chats, or switch to another
            trip.
          </DialogDescription>
        </DialogHeader>
        <div className={COMMAND_INPUT_ROW_CLASS_NAME}>
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <Input
            aria-activedescendant={results.length > 0 ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded
            aria-label="Search"
            autoFocus
            className={COMMAND_INPUT_CLASS_NAME}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Go to a section, find an idea or issue, or switch trip…"
            ref={searchRef}
            role="combobox"
            spellCheck={false}
            value={query}
          />
          <Kbd className="max-sm:hidden">Esc</Kbd>
        </div>
        <div
          aria-label="Results"
          className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-2 scroll-py-1.5"
          id={listId}
          role="listbox"
        >
          {results.length === 0 ? (
            <EmptyResults canLoadMore={canLoadMore} loadMore={loadMoreButton} query={query} />
          ) : (
            groupResults(results).map((section) => (
              <div
                aria-labelledby={groupId(baseId, section.group)}
                className="not-first:mt-2"
                key={section.group}
                role="group"
              >
                <p className={COMMAND_GROUP_HEADING_CLASS_NAME} id={groupId(baseId, section.group)}>
                  {section.group}
                </p>
                {section.items.map(({ index, result }) => (
                  <CommandPaletteOption
                    active={index === activeIndex}
                    id={optionId(index)}
                    key={result.id}
                    onHover={() => setActiveIndex(index)}
                    onSelect={() => go(result)}
                    result={result}
                  />
                ))}
                {canLoadMore && tripGroups.has(section.group) ? loadMoreButton : null}
              </div>
            ))
          )}
        </div>
        <CommandPaletteFooter count={results.length} />
      </DialogContent>
    </Dialog>
  );
}

/** Older trips load from the trip list itself, so only a rendered trip group offers it. */
const tripGroups = new Set<CommandPaletteMatch['group']>(['Switch to', 'Trips']);

function EmptyResults({
  canLoadMore,
  loadMore,
  query
}: {
  canLoadMore: boolean;
  loadMore: ReactNode;
  query: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <SearchX aria-hidden className="mb-1 size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        {query.trim()
          ? `${canLoadMore ? 'No loaded matches' : 'No matches'} for “${query.trim()}”`
          : 'Nothing to jump to yet'}
      </p>
      <p className="text-xs text-muted-foreground">
        {canLoadMore
          ? 'Load more to search older results.'
          : query.trim()
            ? 'Try part of a section, trip, idea, issue, or chat name.'
            : 'Sections, trips, ideas, issues, and chats show up here as you create them.'}
      </p>
      {canLoadMore ? loadMore : null}
    </div>
  );
}

/** Group names can hold spaces ("Go to"), which an element id cannot. */
function groupId(baseId: string, group: string) {
  return `${baseId}-${group.replaceAll(' ', '-')}`;
}

function groupResults(results: CommandPaletteMatch[]) {
  const sections: Array<{
    group: CommandPaletteMatch['group'];
    items: Array<{ index: number; result: CommandPaletteMatch }>;
  }> = [];
  results.forEach((result, index) => {
    const last = sections.at(-1);
    if (last?.group === result.group) last.items.push({ index, result });
    else sections.push({ group: result.group, items: [{ index, result }] });
  });
  return sections;
}
