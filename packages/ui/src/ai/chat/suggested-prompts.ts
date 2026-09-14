import type { AssistantCapability } from '@groam/ai-contracts/agents/registry';

export type SuggestedPrompt = {
  icon: 'compass' | 'message';
  label: string;
  prompt: string;
};

export type ScreenContextCapabilities = {
  capabilities: AssistantCapability[];
};

const defaultSuggestion: SuggestedPrompt = {
  icon: 'message',
  label: 'Summarize what matters on this screen',
  prompt: 'Summarize what matters on the current screen and suggest the next step.'
};

const suggestionsByCapability: Partial<Record<AssistantCapability, SuggestedPrompt>> = {
  'trip.create': {
    icon: 'compass',
    label: 'Start a new trip idea',
    prompt: 'Help me create a new trip idea.'
  },
  'trip.itinerary.read': {
    icon: 'message',
    label: 'Review the itinerary',
    prompt: 'Review this itinerary and suggest the most useful improvement.'
  },
  'trip.status.read': {
    icon: 'message',
    label: 'Check what still needs attention',
    prompt: 'What still needs attention for this trip?'
  },
  'web.search': {
    icon: 'compass',
    label: 'Research useful options',
    prompt: 'Research useful options for the current context.'
  }
};

const capabilityOrder: AssistantCapability[] = [
  'trip.status.read',
  'trip.itinerary.read',
  'trip.create',
  'web.search'
];

/** Returns up to three useful opening prompts for the actions available on a screen. */
export function suggestedPrompts({ capabilities }: ScreenContextCapabilities): SuggestedPrompt[] {
  const available = new Set(capabilities);
  return [
    defaultSuggestion,
    ...capabilityOrder.flatMap((capability) => {
      const suggestion = suggestionsByCapability[capability];
      return available.has(capability) && suggestion ? [suggestion] : [];
    })
  ].slice(0, 3);
}
