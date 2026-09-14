export const agentSurfaceIds = ['chat', 'standalone'] as const;
export type AgentSurface = (typeof agentSurfaceIds)[number];

export const agentRunStatusIds = ['queued', 'running', 'complete', 'failed', 'aborted'] as const;
export type AgentRunStatus = (typeof agentRunStatusIds)[number];

export const agentRunKickoffIds = ['assign', 'queue'] as const;
export type AgentRunKickoff = (typeof agentRunKickoffIds)[number];

export const agentRunEventKindIds = ['status', 'thought', 'tool', 'report', 'error'] as const;
export type AgentRunEventKind = (typeof agentRunEventKindIds)[number];

export const agentRosterStatusIds = ['failed', 'idle', 'working'] as const;
export type AgentRosterStatus = (typeof agentRosterStatusIds)[number];

export const RUN_STATUS_LABEL = {
  aborted: 'Stopped',
  complete: 'Done',
  failed: 'Failed',
  queued: 'Queued',
  running: 'Running'
} as const satisfies Record<AgentRunStatus, string>;

export const ROSTER_STATUS_LABEL = {
  failed: 'Needs attention',
  idle: 'Idle',
  working: 'Working'
} as const satisfies Record<AgentRosterStatus, string>;
