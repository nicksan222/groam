import { Badge } from '@groam/ui/components/badge';
import { Button } from '@groam/ui/components/button';
import Shell from '@groam/ui/components/shell/client';
import { ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import {
  changeSummaryDescription,
  changeSummaryTitle
} from '@/features/ideas/idea-list/idea-page-copy';
import type { useTripVersion } from '@/features/trips/hooks/use-trip-versions';
import { formatDate } from '@/features/trips/hooks/version-format';
import { testIds } from '@/lib/test-ids';
import type { ProposalFeedbackItem, VersionStatus } from './proposal-types';
import { VisualChange } from './visual-change';

export function ChangeSummary({
  asOf,
  changes,
  comments,
  onComment,
  status
}: {
  asOf?: number;
  changes: NonNullable<ReturnType<typeof useTripVersion>['proposal']>['changes'];
  comments?: ProposalFeedbackItem[] | null;
  onComment?: (changeKey: string, content: string) => Promise<boolean>;
  status: VersionStatus;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const allCollapsed = changes.length > 0 && changes.every((change) => collapsed.has(change.key));
  return (
    <Shell.Section
      aria-labelledby="idea-changes-heading"
      className="overflow-hidden"
      data-testid={testIds.compareSharedTrip}
      id="changes"
    >
      <Shell.SectionHeader
        trailing={<Badge variant="secondary">{changes.length}</Badge>}
        density="compact"
        description={changeSummaryDescription}
        icon={ArrowLeftRight}
        title={<span id="idea-changes-heading">{changeSummaryTitle}</span>}
      />
      {asOf ? (
        <p className="mb-2 px-1 text-xs text-muted-foreground">
          Changes vs. shared trip as of {formatDate(asOf)}
        </p>
      ) : null}
      {changes.length > 1 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Open a change to compare its details.</p>
          <Button
            onClick={() =>
              setCollapsed(allCollapsed ? new Set() : new Set(changes.map((change) => change.key)))
            }
            size="sm"
            variant="outline"
          >
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        </div>
      )}
      {changes.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {status === 'draft'
            ? 'Make a change in Overview or Itinerary. It will appear here before you send the idea for review.'
            : 'This idea matches the shared trip.'}
        </p>
      ) : (
        <div className="space-y-4">
          {changes.map((change) => (
            <VisualChange
              change={change}
              expanded={!collapsed.has(change.key)}
              onToggle={() =>
                setCollapsed((current) => {
                  const next = new Set(current);
                  if (next.has(change.key)) next.delete(change.key);
                  else next.add(change.key);
                  return next;
                })
              }
              comments={comments?.filter((comment) => comment.changeKey === change.key) ?? []}
              key={`${change.entity}:${change.key}`}
              onComment={onComment ? (content) => onComment(change.key, content) : undefined}
            />
          ))}
        </div>
      )}
    </Shell.Section>
  );
}
