import type { Id } from '@groam/backend/data-model';
import { toast } from '@groam/ui/components/toast';
import { useIssueMutations } from '@/features/issues/hooks/use-issue-mutations';
import { issueStatusMeta } from '@/features/issues/issue-status';
import type { IssueAssigneeInput, IssueStatus } from '@/types/issues';
import type { QueueItem } from '@/types/queue';
import { useIssueDue } from './use-issue-due';

const issues = (count: number) => `${count} issue${count === 1 ? '' : 's'}`;
const dueFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' });

/**
 * Applies one change to every selected issue, then says what moved. Resolves to the ids that took
 * the change, so the caller keeps the failures selected; the mutations toast their own errors.
 */
export function useQueueBatch(selected: readonly QueueItem[]) {
  const { assign, setStatus } = useIssueMutations();
  const setDue = useIssueDue();

  const run = async (
    apply: (id: Id<'tripIssues'>) => Promise<boolean>,
    message: (count: number) => string
  ) => {
    const results = await Promise.all(
      selected.map(async (item) => ((await apply(item.id as Id<'tripIssues'>)) ? item.id : null))
    );
    const done = results.filter((id) => id !== null);
    if (done.length > 0) toast.success(message(done.length));
    return done;
  };

  return {
    assign: (assignee: IssueAssigneeInput | null) =>
      run(
        (id) => assign(id, assignee),
        (count) =>
          assignee ? `Assigned ${issues(count)} to ${assignee.name}` : `Unassigned ${issues(count)}`
      ),
    setDue: (dueAt: number | null) =>
      run(
        (id) => setDue(id, dueAt),
        (count) =>
          dueAt === null
            ? `Cleared the decide-by date on ${issues(count)}`
            : `Set decide by ${dueFormatter.format(dueAt)} on ${issues(count)}`
      ),
    setStatus: (status: IssueStatus) =>
      run(
        (id) => setStatus(id, status),
        (count) => `Moved ${issues(count)} to ${issueStatusMeta[status].label}`
      )
  };
}
