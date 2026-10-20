import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { PageLoading } from '@groam/ui/components/page-loading';
import { RecordList } from '@groam/ui/components/record-list';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { recordListSorts } from '@/features/workspace/workspace-list/record-list-sorts';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { ResearchListRow } from './research-list-row';

const RESEARCH_LIST_RESOURCE = { plural: 'research', singular: 'research' } as const;
const sortOptions = recordListSorts<ResearchSummary>();

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
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return researches;
    return researches.filter((research) =>
      `${research.title} ${research.brief ?? ''}`.toLowerCase().includes(needle)
    );
  }, [query, researches]);

  if (isLoading) return <PageLoading label="Loading researches…" />;

  if (researches.length === 0) {
    return (
      <DashedEmpty
        action={
          onCreate ? (
            <Button className="mt-4" onClick={onCreate} variant="outline">
              Start a research
            </Button>
          ) : undefined
        }
        className="py-12"
        icon={Search}
        title="No research yet"
      >
        Start a research: dump links and notes about one subject
      </DashedEmpty>
    );
  }

  return (
    <div data-testid={testIds.researchList}>
      <RecordList
        empty="No research matches your search."
        getKey={(research) => research.id}
        items={visible}
        onQueryChange={setQuery}
        query={query}
        renderItem={(research) => <ResearchListRow onOpen={onOpen} research={research} />}
        resourceLabel={RESEARCH_LIST_RESOURCE}
        sortOptions={sortOptions}
      />
    </div>
  );
}
