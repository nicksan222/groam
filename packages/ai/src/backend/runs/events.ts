export const agentRunEventLabels = {
  issueReportReady: 'Report ready',
  issueStarted: 'Started working on this issue',
  reviewComplete: 'Review complete',
  reviewStarted: 'Reviewing idea',
  runFailed: 'Run failed',
  thought: 'Thought'
} as const;

export const agentRunCopy = {
  cancelWait: 'Cancel wait',
  issueQueued: 'Queued to work this issue.',
  rerun: 'Re-run',
  retryFromZero: 'Retry from zero',
  stop: 'Stop',
  viewAgent: 'View agent',
  waitingFor: 'Waiting for'
} as const;

export const agentRunFallbackReport = {
  issueComplete: 'Finished working on this issue.'
} as const;
