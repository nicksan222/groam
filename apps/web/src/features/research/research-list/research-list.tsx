import { Button } from '@groam/ui/components/button';
import { DashedEmpty } from '@groam/ui/components/dashed-empty';
import { DataTable } from '@groam/ui/components/data-table';
import { PageLoading } from '@groam/ui/components/page-loading';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { testIds } from '@/lib/test-ids';
import type { ResearchSummary } from '@/types/research';
import { researchColumns } from './research-list-columns';

const RESEARCH_LIST_RESOURCE = { plural: 'research', singular: 'research' } as const;

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
  const columns = useMemo(() => researchColumns(), []);
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
    <DataTable
      columns={columns}
      data={visible}
      empty="No research matches your search."
      externalFilter
      filterValue={query}
      getRowId={(research) => research.id}
      getRowProps={(research) => ({
        'data-research-id': research.id,
        'data-testid': testIds.researchCard
      })}
      onFilterValueChange={setQuery}
      onRowActivate={onOpen}
      resourceLabel={RESEARCH_LIST_RESOURCE}
      testId={testIds.researchList}
    />
  );
}
