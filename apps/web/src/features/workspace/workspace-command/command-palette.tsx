import { Search, SearchX } from '@groam/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@groam/ui/components/dialog';
import { Input } from '@groam/ui/components/input';
import { Kbd } from '@groam/ui/components/kbd';
import { useId } from 'react';
import type { CommandPaletteMatch } from '@/features/workspace/hooks/command-palette-results';
import { useCommandPalette } from '@/features/workspace/hooks/use-command-palette';
import { testIds } from '@/lib/test-ids';
import { CommandPaletteFooter } from './command-palette-footer';
import { CommandPaletteOption } from './command-palette-option';

export function CommandPalette() {
  const {
    activeIndex,
    go,
    onInputKeyDown,
    onOpenChange,
    open,
    query,
    results,
    setActiveIndex,
    setQuery
  } = useCommandPalette();
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 shadow-lg sm:max-w-xl"
        data-testid={testIds.commandPalette}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Jump to</DialogTitle>
          <DialogDescription>Search trips, ideas, issues, chats, and agents.</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2.5 border-b px-4">
          <Search aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <Input
            aria-activedescendant={results.length > 0 ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded
            aria-label="Search"
            autoFocus
            className="h-12 border-0 bg-transparent px-0 text-[15px] shadow-none focus-visible:ring-0 dark:bg-transparent"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to a trip, idea, issue, chat, or agent…"
            role="combobox"
            spellCheck={false}
            value={query}
          />
          <Kbd className="max-sm:hidden">Esc</Kbd>
        </div>
        <div
          aria-label="Results"
          className="max-h-[min(26rem,60vh)] overflow-y-auto overscroll-contain p-1.5 scroll-py-1.5"
          id={listId}
          role="listbox"
        >
          {results.length === 0 ? (
            <EmptyResults query={query} />
          ) : (
            groupResults(results).map((section) => (
              <div
                aria-labelledby={`${baseId}-${section.group}`}
                className="not-first:mt-1.5"
                key={section.group}
                role="group"
              >
                <p
                  className="px-2 pt-1.5 pb-1 text-[11px] font-medium text-muted-foreground"
                  id={`${baseId}-${section.group}`}
                >
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
              </div>
            ))
          )}
        </div>
        <CommandPaletteFooter count={results.length} />
      </DialogContent>
    </Dialog>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-10 text-center">
      <SearchX aria-hidden className="mb-1 size-5 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">
        {query.trim() ? `No matches for “${query.trim()}”` : 'Nothing to jump to yet'}
      </p>
      <p className="text-xs text-muted-foreground">
        {query.trim()
          ? 'Try part of a trip, idea, issue, or chat name.'
          : 'Trips, ideas, issues, and chats show up here as you create them.'}
      </p>
    </div>
  );
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
