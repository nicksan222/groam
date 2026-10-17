import type { WorkspaceAgentRun } from '@/features/agents/hooks/use-workspace-agent-runs';
import type { WorkspaceIssue } from '@/features/issues/hooks/use-workspace-issues';

const WAITING_RUN_LIMIT = 3;
const ACTIVITY_RUN_LIMIT = 4;
const ASSIGNED_ISSUE_LIMIT = 3;
const OPEN_ISSUE_LIMIT = 4;

const inFlightStatuses = new Set<WorkspaceAgentRun['status']>(['queued', 'running']);
const activeIssueStatuses = new Set<WorkspaceIssue['status']>(['in_progress', 'open']);

const byUpdatedAtDesc = <T extends { updatedAt: number }>(a: T, b: T) => b.updatedAt - a.updatedAt;

function isAssignedToViewer(issue: WorkspaceIssue, viewerUserId: string) {
  return issue.assignee?.kind === 'user' && issue.assignee.userId === viewerUserId;
}

/** Runs suspended on the group (input or approval), newest first. */
export function selectWaitingRuns(runs: readonly WorkspaceAgentRun[]) {
  return runs
    .filter((run) => run.status === 'waiting')
    .toSorted(byUpdatedAtDesc)
    .slice(0, WAITING_RUN_LIMIT);
}

/** In-flight runs first, then the most recent finished ones; waiting runs live in "Needs you". */
export function selectActivityRuns(runs: readonly WorkspaceAgentRun[]) {
  const rest = runs.filter((run) => run.status !== 'waiting');
  const inFlight = rest.filter((run) => inFlightStatuses.has(run.status));
  const recent = rest.filter((run) => !inFlightStatuses.has(run.status));
  return [...inFlight.toSorted(byUpdatedAtDesc), ...recent.toSorted(byUpdatedAtDesc)].slice(
    0,
    ACTIVITY_RUN_LIMIT
  );
}

/** Active issues the viewer owns. */
export function selectAssignedIssues(issues: readonly WorkspaceIssue[], viewerUserId: string) {
  return issues
    .filter(
      (issue) => activeIssueStatuses.has(issue.status) && isAssignedToViewer(issue, viewerUserId)
    )
    .toSorted(byUpdatedAtDesc)
    .slice(0, ASSIGNED_ISSUE_LIMIT);
}

/** Active issues that are not the viewer's own (those show under "Needs you"). */
export function selectOpenIssues(issues: readonly WorkspaceIssue[], viewerUserId: string) {
  return issues
    .filter(
      (issue) => activeIssueStatuses.has(issue.status) && !isAssignedToViewer(issue, viewerUserId)
    )
    .toSorted(byUpdatedAtDesc)
    .slice(0, OPEN_ISSUE_LIMIT);
}
