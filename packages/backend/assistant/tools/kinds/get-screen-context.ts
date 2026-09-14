import { createTool } from '@convex-dev/agent';
import * as z from 'zod/v3';
import { defineCapability } from '#backend/assistant/tools/factory';
import type { AssistantScreen } from '#convex/modules/assistant/screen/index';

const emptyInputSchema = z.object({});

function screenContextSnapshot(screen: AssistantScreen) {
  let data: unknown = screen.data;
  try {
    data = JSON.parse(screen.data) as unknown;
  } catch {
    // Keep non-JSON context as text.
  }
  return {
    capabilities: screen.capabilities,
    data,
    description: screen.description,
    key: screen.key,
    target: screen.target,
    title: screen.title
  };
}

export const getScreenContextCapability = defineCapability({
  create: ({ screen }) =>
    createTool({
      description: `Read the data and purpose registered by the current ${screen.title} page. Use this before asking the traveler to identify something already shown on the page.`,
      execute: async () => ({
        context: screenContextSnapshot(screen)
      }),
      inputSchema: emptyInputSchema
    }),
  guidance:
    'When a request could refer to the current page, call getScreenContext first and use its target as the default. Never ask the traveler which trip they mean when the returned target already identifies one. Use findWorkspaceContext only when the traveler names or clearly implies something else.',
  id: 'context.screen.read',
  toolName: 'getScreenContext'
});
