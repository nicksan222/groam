export function agentHref(agentId: string) {
  return {
    params: { agentId },
    to: '/agents/$agentId' as const
  };
}

export function agentRunHref(agentId: string, runId: string) {
  return {
    params: { agentId, runId },
    to: '/agents/$agentId/$runId' as const
  };
}
