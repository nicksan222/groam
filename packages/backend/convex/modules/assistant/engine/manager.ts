import { WorkflowManager } from '@convex-dev/workflow';
import { components } from '#convex-generated/api';

/**
 * The single workflow manager for agent runs. Turns opt out of retries per step; the workpool
 * logs warnings and errors only (its default periodic reports would flood function logs).
 */
export const agentWorkflow = new WorkflowManager(components.workflow, {
  // Chat replies used to stream from unbounded client actions; 50 keeps them from queueing.
  workpoolOptions: { logLevel: 'WARN', maxParallelism: 50, retryActionsByDefault: false }
});
