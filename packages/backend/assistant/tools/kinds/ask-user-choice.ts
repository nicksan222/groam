import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';

export const askUserChoiceCapability = defineCapability({
  create: ({ scope }) =>
    scope === 'standalone'
      ? null
      : createTool({
          description:
            'Present a short clarification question with exactly three tappable answers; the interface always adds a fourth free-text answer. Use only when missing information blocks a useful answer. Never use it to ask permission to complete the traveler’s requested review, suggestion, recommendation, summary, or explanation.',
          execute: async (_toolCtx, input) => input,
          inputSchema: z.object({
            options: z.array(z.string().min(1).max(100)).length(3),
            question: z.string().min(1).max(240)
          })
        }),
  guidance:
    'Use askUserChoice only when one missing decision blocks a useful answer and provide exactly three short predefined answers; the interface provides a fourth custom text answer. Do not use it to defer a requested review, suggestion, recommendation, summary, or explanation. Use the generated form format for multiple fields or mixed input types. Do not select for the traveler.',
  id: 'ui.askUserChoice',
  toolName: 'askUserChoice'
});
