import { describe, expect, test } from 'vitest';
import { buildCommandPaletteMatches } from './command-palette-results';

describe('buildCommandPaletteMatches', () => {
  test('ranks matching trips and caps at 20', () => {
    const trips = Array.from({ length: 25 }, (_, index) => ({
      id: `trip-${index}`,
      name: `Trip ${index}`
    }));
    const results = buildCommandPaletteMatches(
      'trip',
      { agents: [], discussions: [], ideas: [], issues: [], trips },
      {
        agentHref: (agentId) => ({ params: { agentId }, to: '/agents/$agentId' }),
        ideaHref: (idea) => ({
          params: { proposalId: idea.id, tripId: idea.sourceTripId },
          to: '/ideas'
        })
      }
    );
    expect(results).toHaveLength(20);
    expect(results[0]?.kind).toBe('Trip');
  });

  test('matches agents by label and includes Agents shortcut', () => {
    const results = buildCommandPaletteMatches(
      'plan',
      {
        agents: [{ id: 'a1', label: 'Planner', latestRun: null, surface: 'chat' }],
        discussions: [],
        ideas: [],
        issues: [],
        trips: []
      },
      {
        agentHref: (agentId) => ({ params: { agentId }, to: '/agents/$agentId' }),
        ideaHref: (idea) => ({
          params: { proposalId: idea.id, tripId: idea.sourceTripId },
          to: '/ideas'
        })
      }
    );
    expect(results.map((item) => item.id)).toEqual(['agent:a1']);
  });
});
