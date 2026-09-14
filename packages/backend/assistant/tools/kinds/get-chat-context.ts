import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';
import { internal } from '#convex-generated/api';

const emptyInputSchema = z.object({});

export const getChatContextCapability = defineCapability({
  create: ({ scope, threadId }) => {
    if (scope === 'standalone' || !threadId) return null;
    return createTool({
      description:
        'Read the authoritative trips, destinations, and activities currently attached to this AI chat. Use this whenever saved context would help.',
      execute: async (toolCtx) => {
        const context = await toolCtx.runQuery(
          internal.modules.assistant.model.index.taggedContext,
          {
            scope,
            threadId
          }
        );
        return { context };
      },
      inputSchema: emptyInputSchema
    });
  },
  guidance: 'Call getChatContext when saved AI chat attachments may help answer the request.',
  id: 'context.chat.read',
  toolName: 'getChatContext'
});
