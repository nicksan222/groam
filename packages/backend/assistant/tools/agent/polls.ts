import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { deadlineHoursField, pollRuleInputSchema } from '#backend/assistant/tools/agent/waits';
import { internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';

const HOUR_MS = 60 * 60 * 1000;

/** Asks the group; with `waitFor`, reports `wait: true` so the generation stops. */
export function createPollTool(activeTripId: Id<'trips'> | null) {
  return createTool({
    description:
      'Ask the group a multiple-choice question. Optionally wait for an outcome; then stop and resume with the result.',
    execute: async (toolCtx, input) => {
      const created = await toolCtx.runMutation(internal.modules.assistant.model.polls.createPoll, {
        ...(activeTripId ? { activeTripId } : {}),
        multiSelect: input.multiSelect,
        options: input.options,
        question: input.question,
        ...(input.waitFor
          ? {
              waitFor: {
                deadlineAt: Date.now() + input.waitFor.deadlineHours * HOUR_MS,
                rule: input.waitFor.rule
              }
            }
          : {})
      });
      return { pollId: created.pollId, wait: created.waitId !== null, waitId: created.waitId };
    },
    inputSchema: z.object({
      multiSelect: z.boolean().default(false).describe('Let people pick more than one option.'),
      options: z.array(z.string().min(1).max(80)).min(2).max(10),
      question: z.string().min(1).max(200),
      waitFor: z
        .object({ deadlineHours: deadlineHoursField, rule: z.array(pollRuleInputSchema).min(1) })
        .optional()
        .describe('Resume this run when any rule holds, or at the deadline.')
    })
  });
}
