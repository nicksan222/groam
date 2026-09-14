import { createTool } from '@convex-dev/agent';
import { AssistantContextTags } from '@groam/ai-contracts/agents/registry';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';
import { internal } from '#convex-generated/api';

export const setChatContextCapability = defineCapability({
  create: ({ scope, threadId }) => {
    if (scope === 'standalone' || !threadId) return null;
    return createTool({
      description:
        'Replace the attachments on this AI chat with confirmed trip, destination, or activity ids from findWorkspaceContext.',
      execute: async (toolCtx, input) => {
        const tags = await toolCtx.runMutation(
          internal.modules.assistant.model.index.setContextTags,
          {
            scope,
            tags: input.tags.map((tag) => AssistantContextTags.referenceForMutation(tag)),
            threadId
          }
        );
        return { tags };
      },
      inputSchema: z.object({
        tags: z
          .array(AssistantContextTags.inputSchema())
          .max(12)
          .describe('The complete set of entities that should remain attached to this AI chat.')
      })
    });
  },
  guidance:
    'When asked to attach or switch context, call findWorkspaceContext before setChatContext.',
  id: 'context.chat.set',
  toolName: 'setChatContext',
  writeIntent: ['attach', 'connect', 'detach', 'remove', 'switch', 'tag']
});
