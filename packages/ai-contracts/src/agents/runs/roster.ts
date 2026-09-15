import type { AgentRosterStatus, AgentRunStatus } from '#ai-contracts/agents/runs/ids';

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

export function canRetryAgentRunFromZero(run: {
  issueId?: string | null;
  status: AgentRunStatus;
}): boolean {
  return run.status === 'failed' && run.issueId != null && run.issueId !== '';
}

export function canRerunIssueAgent(run: {
  issueId?: string | null;
  status: AgentRunStatus;
}): boolean {
  return (
    (run.status === 'complete' || run.status === 'aborted') &&
    run.issueId != null &&
    run.issueId !== ''
  );
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

export type LatestAgentRunView = {
  error: string | null;
  headline: string | null;
  id: string;
  status: AgentRunStatus;
  title: string;
  updatedAt: number;
};

export function presentLatestAgentRun<T extends LatestAgentRunView>(run: T): T {
  return {
    error: run.error,
    headline: run.headline,
    id: run.id,
    status: run.status,
    title: run.title,
    updatedAt: run.updatedAt
  } as T;
}
