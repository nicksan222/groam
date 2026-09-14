import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';
import type { AssistantContextCatalogItem } from '#convex/modules/assistant/model/index';
import { internal } from '#convex-generated/api';

export const findWorkspaceContextCapability = defineCapability({
  create: () =>
    createTool({
      description:
        'Find exact trip, destination, or activity ids in the workspace when the current screen and AI chat attachments are not enough.',
      execute: async (toolCtx, input) => {
        const catalog: AssistantContextCatalogItem[] = await toolCtx.runQuery(
          internal.modules.assistant.model.index.contextCatalog,
          {}
        );
        const query = input.query.trim().toLocaleLowerCase();
        const results = catalog
          .filter((item) => `${item.label} ${item.description}`.toLocaleLowerCase().includes(query))
          .slice(0, 20);
        return { results };
      },
      inputSchema: z.object({
        query: z.string().min(1).max(100).describe('A trip, place, or activity name.')
      })
    }),
  guidance:
    'Use findWorkspaceContext only when neither the screen nor current AI chat attachments identify the required entity. Never invent entity ids.',
  id: 'context.workspace.find',
  toolName: 'findWorkspaceContext'
});
