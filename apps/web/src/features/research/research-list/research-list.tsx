import { Search } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { List, parseListSearch } from '@groam/ui/components/list';
import { PageLoading } from '@groam/ui/components/page-loading';
import { useMemo, useState } from 'react';
import { useTripListControls } from '@/features/trips/hooks/use-trip-list-controls';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { ResearchListRow } from './research-list-row';

const RESEARCH_LIST_RESOURCE = { plural: 'threads', singular: 'thread' } as const;
const compareUnreadFirst = (a: ResearchSummary, b: ResearchSummary) =>
  Number(b.unread) - Number(a.unread) || b.updatedAt - a.updatedAt;
const sortOptions = [
  { compare: compareUnreadFirst, label: 'Unread first', value: 'priority' },
  ...recordListSorts<ResearchSummary>()
];
const facets = [
  { description: 'Unread research', key: 'is', values: [{ value: 'unread' }] },
  { description: 'Research with saved links', key: 'has', values: [{ value: 'links' }] }
];
const filterKeys = facets.map(({ key }) => key);

export function ResearchList({
  isLoading = false,
  onCreate,
  onOpen,
  researches
}: {
  isLoading?: boolean;
  onCreate?: () => void;
  onOpen: (research: ResearchSummary) => void;
  researches: ResearchSummary[];
}) {
  const [query, setQuery] = useState('');
  const { searching, sorting } = useTripListControls();
  const [sort, setSort] = useState('priority');
  const selectedSort = sortOptions.find((option) => option.value === sort) ?? sortOptions[0];
  const visible = useMemo(() => {
    const { filters, text } = parseListSearch(query, filterKeys);
    const needle = text.toLowerCase();
    const matches = researches.filter((research) => {
      if (filters.is && !filters.is.some((value) => value === 'unread' && research.unread))
        return false;
      if (filters.has && !filters.has.some((value) => value === 'links' && research.linkCount > 0))
        return false;
      return `${research.title} ${research.brief ?? ''}`.toLowerCase().includes(needle);
    });
    return matches.toSorted(selectedSort?.compare ?? compareUnreadFirst);
  }, [query, researches, selectedSort]);
  const unread = visible.filter((research) => research.unread);
  const read = visible.filter((research) => !research.unread);
  const groups = [
    { items: unread, label: 'Unread' },
    { items: read, label: unread.length > 0 ? 'Read' : null }
  ].filter((group) => group.items.length > 0);

  return (
    <List data-testid={testIds.researchList} fill>
      <List.Search
        count={{ shown: visible.length, total: researches.length }}
        facets={facets}
        noun={RESEARCH_LIST_RESOURCE}
        onOpenChange={(next) => (next ? searching.openPanel() : searching.closePanel())}
        onQueryChange={setQuery}
        open={searching.open}
        query={query}
      />
      <List.Body>
        {isLoading ? (
          <PageLoading label="Loading researches…" />
        ) : researches.length === 0 ? (
          <List.Empty
            buttonRaw={
              onCreate ? (
                <Button onClick={onCreate} variant="outline">
                  Start a research
                </Button>
              ) : undefined
            }
            description="Start a research: dump links and notes about one subject"
            headline="No research yet"
            icon={Search}
          />
        ) : visible.length === 0 ? (
          <List.Empty
            description="Remove a filter, or clear the search."
            headline={`No matches for “${query.trim()}”`}
            icon={Search}
          />
        ) : (
          groups.map((group) => (
            <List.Group
              aria-label="Threads"
              count={group.items.length}
              key={group.label ?? 'all'}
              label={group.label}
            >
              {group.items.map((research) => (
                <ResearchListRow key={research.id} onOpen={onOpen} research={research} />
              ))}
            </List.Group>
          ))
        )}
      </List.Body>
      <List.Footer desktopOnly>
        <List.Controls>
          <List.Sort
            grouped
            noun={RESEARCH_LIST_RESOURCE}
            onOpenChange={sorting.setOpen}
            onValueChange={setSort}
            open={sorting.open}
            options={sortOptions}
            value={sort}
          />
          <List.SearchTrigger onClick={searching.openPanel} />
        </List.Controls>
      </List.Footer>
    </List>
  );
}
