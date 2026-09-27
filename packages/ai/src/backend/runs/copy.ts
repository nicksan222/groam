import { assistantFailureMessage } from '#ai/backend/errors';
import { agentRunCopy, agentRunEventLabels } from '#ai/backend/runs/events';
import { type AgentRunStatus, RUN_STATUS_LABEL } from '#ai/backend/runs/ids';

export type AgentRunMessageSource = {
  error?: string | null;
  headline: string | null;
  status: AgentRunStatus;
};

/** Traveler-facing headline for a run, including provider/credit failures. */
export function presentAgentRunMessage(run: AgentRunMessageSource): string {
  if (run.status === 'failed') {
    if (run.error?.trim()) return assistantFailureMessage(run.error);
    if (run.headline?.trim()) return run.headline;
    return agentRunEventLabels.runFailed;
  }
  if (run.headline?.trim()) return run.headline;
  if (run.status === 'aborted') return RUN_STATUS_LABEL.aborted;
  return agentRunCopy.issueQueued;
}

export { agentRunCopy, agentRunEventLabels };
