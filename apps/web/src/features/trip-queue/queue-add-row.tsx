import { MAX_ISSUE_TITLE_LENGTH } from '@groam/backend/convex/modules/travel/issues/lengths';
import type { Id } from '@groam/backend/data-model';
import { InlineAddRow } from '@groam/ui/components/inline-add-row';
import { useCreateIssue } from '@/features/issues/hooks/use-workspace-issues';

/**
 * The line that closes the open groups of the Issues ledger, above Settled: type a question and press Enter to raise a title-only issue.
 * The input clears and keeps focus for the next one; Escape lets go. The full dialog stays behind
 * the header's New issue.
 */
export function QueueAddRow({ tripId }: { tripId: Id<'trips'> }) {
  const createIssue = useCreateIssue();

  return (
    <InlineAddRow
      className="border-b border-border/60 pr-4 pl-4 md:pr-6"
      label="Add a question"
      maxLength={MAX_ISSUE_TITLE_LENGTH}
      onAdd={(text) => createIssue(tripId, text, '')}
      placeholder="Add a question…"
      variant="ledger"
    />
  );
}
