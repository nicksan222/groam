import type { EventId } from '@convex-dev/workflow';
import { v } from 'convex/values';
import { internal } from '#convex-generated/api';
import { agentWorkflow } from '#convex/modules/assistant/engine/manager';
import {
  type RunOutcome,
  runOutcomeValidator,
  type TurnResult,
  type WaitResume,
  waitResumeValidator
} from '#convex/modules/assistant/engine/schema';

export const MAX_TURNS = 25;

/**
 * FROZEN. Runs may sleep for days and replay across deploys; any change to the steps this body
 * issues fails in-flight runs with a determinism violation. All behavior belongs in the `turn`
 * action. A real change ships as a new workflow (`agentRunV2`) beside this one.
 */
export const agentRun = agentWorkflow
  .define({ args: { runId: v.id('agentRuns') }, returns: runOutcomeValidator })
  .handler(async (step, { runId }): Promise<RunOutcome> => {
    let resume: WaitResume | undefined;
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const result: TurnResult = await step.runAction(
        internal.modules.assistant.engine.turn.run,
        resume ? { resume, runId } : { runId },
        { retry: false }
      );
      if (result.kind !== 'wait') return result;
      resume = await step.awaitEvent({
        id: result.eventId as EventId,
        validator: waitResumeValidator
      });
    }
    return { kind: 'exhausted' };
  });
