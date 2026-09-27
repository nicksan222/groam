import { assistantInputStrategies } from '#ai/ui/form/inputs';
import { assistantDisplayStrategies } from '#ai/ui/form/predefined-components';

/**
 * Strategy registry for assistant-generated UI. Add a component strategy in its
 * category, then expose the same component ID in the backend form catalog.
 */
export const assistantComponentStrategies = {
  ...assistantDisplayStrategies,
  ...assistantInputStrategies
} as const;
