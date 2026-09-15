import { defineCapability } from '#backend/assistant/tools/factory';

export const webSearchCapability = defineCapability({
  createToolSet: ({ providerTools }) => providerTools ?? null,
  guidance:
    'For planning questions, use web search when current external information would improve the answer.',
  id: 'web.search',
  toolName: 'webSearch'
});
