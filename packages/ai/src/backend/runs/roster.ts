import type { AgentRosterStatus, AgentRunStatus } from '#ai/backend/runs/ids';

export const activeAgentRunStatusIds = [
  'queued',
  'running'
] as const satisfies readonly AgentRunStatus[];

export type RunStatusSlice = {
  status: AgentRunStatus;
};

export function isActiveAgentRun(run: RunStatusSlice): boolean {
  return activeAgentRunStatusIds.some((status) => status === run.status);
}

function hasIssueId(issueId: string | null | undefined): boolean {
  return issueId != null && issueId !== '';
}

export type IssueAgentRunSlice = {
  issueId?: string | null;
  status: AgentRunStatus;
};

export function canRetryAgentRunFromZero(run: IssueAgentRunSlice): boolean {
  return run.status === 'failed' && hasIssueId(run.issueId);
}

export function canRerunIssueAgent(run: IssueAgentRunSlice): boolean {
  return (run.status === 'complete' || run.status === 'aborted') && hasIssueId(run.issueId);
}

export function countActiveAgentRuns<T extends RunStatusSlice>(runs: readonly T[]): number {
  return runs.reduce((count, run) => (isActiveAgentRun(run) ? count + 1 : count), 0);
}

export function rosterStatusFromRuns<T extends RunStatusSlice>(
  runs: readonly T[]
): AgentRosterStatus {
  if (runs.some(isActiveAgentRun)) return 'working';
  if (runs[0]?.status === 'failed') return 'failed';
  return 'idle';
}

export type LatestAgentRunView<RunId = string> = {
  error: string | null;
  headline: string | null;
  id: RunId;
  status: AgentRunStatus;
  title: string;
  updatedAt: number;
};

export function presentLatestAgentRun<RunId>(
  run: LatestAgentRunView<RunId>
): LatestAgentRunView<RunId> {
  return {
    error: run.error,
    headline: run.headline,
    id: run.id,
    status: run.status,
    title: run.title,
    updatedAt: run.updatedAt
  };
}
