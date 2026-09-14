import type { AssistantCapability } from '@groam/ai-contracts/agents/registry';
import { describe, expect, test } from 'vitest';
import { suggestedPrompts } from './suggested-prompts';

const defaultSuggestion = {
  icon: 'message',
  label: 'Summarize what matters on this screen',
  prompt: 'Summarize what matters on the current screen and suggest the next step.'
};

describe('suggestedPrompts', () => {
  test.each([
    ['trip status', 'trip.status.read', 'Check what still needs attention'],
    ['trip itinerary', 'trip.itinerary.read', 'Review the itinerary'],
    ['trip creation', 'trip.create', 'Start a new trip idea'],
    ['web research', 'web.search', 'Research useful options']
  ] as const)('adds the %s prompt when its capability is available', (_, capability, label) => {
    expect(suggestedPrompts({ capabilities: [capability] })).toEqual([
      defaultSuggestion,
      expect.objectContaining({ label })
    ]);
  });

  test('uses a stable priority, ignores unrelated capabilities, and limits the list to three', () => {
    const capabilities: AssistantCapability[] = [
      'web.search',
      'trip.create',
      'trip.activity.add',
      'trip.itinerary.read',
      'trip.status.read'
    ];

    expect(suggestedPrompts({ capabilities })).toEqual([
      defaultSuggestion,
      {
        icon: 'message',
        label: 'Check what still needs attention',
        prompt: 'What still needs attention for this trip?'
      },
      {
        icon: 'message',
        label: 'Review the itinerary',
        prompt: 'Review this itinerary and suggest the most useful improvement.'
      }
    ]);
  });

  test('falls back to the screen summary prompt when no relevant capability is available', () => {
    expect(suggestedPrompts({ capabilities: ['trip.activity.add', 'trip.cost.manage'] })).toEqual([
      defaultSuggestion
    ]);
  });
});
