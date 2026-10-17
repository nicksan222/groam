import { describe, expect, test } from 'vite-plus/test';
import { buildCommandPaletteMatches, type CommandPaletteSource } from './command-palette-results';

const hrefs = {
  agentHref: (agentId: string) => ({ params: { agentId }, to: '/agents/$agentId' }),
  ideaHref: (idea: { id: string; sourceTripId: string }) => ({
    params: { proposalId: idea.id, tripId: idea.sourceTripId },
    to: '/ideas'
  })
};

const empty: CommandPaletteSource = {
  agents: [],
  discussions: [],
  ideas: [],
  issues: [],
  trips: []
};

describe('buildCommandPaletteMatches', () => {
  test('sorts trips naturally and caps each group while searching', () => {
    const trips = Array.from({ length: 25 }, (_, index) => ({
      id: `trip-${24 - index}`,
      name: `Trip ${24 - index}`
    }));
    const results = buildCommandPaletteMatches('trip', { ...empty, trips }, hrefs);
    expect(results.map((item) => item.label)).toEqual([
      'Trip 0',
      'Trip 1',
      'Trip 2',
      'Trip 3',
      'Trip 4',
      'Trip 5'
    ]);
    expect(results[0]).toMatchObject({ group: 'Trips', highlight: [0, 4] });
  });

  test('browses groups in a fixed order, alphabetised, with the agents page last', () => {
    const results = buildCommandPaletteMatches(
      '',
      {
        ...empty,
        agents: [{ id: 'a1', label: 'Planner', latestRun: null, surface: 'chat' }],
        discussions: [{ id: 'd1', title: 'Flights' }],
        trips: [
          { id: 't2', name: 'lisbon' },
          { id: 't1', name: 'Kyoto' }
        ]
      },
      hrefs
    );
    expect(results.map((item) => item.id)).toEqual([
      'trip:t1',
      'trip:t2',
      'chat:d1',
      'agent:a1',
      'agents'
    ]);
  });

  test('ranks prefix and word matches above substrings and leads with the best group', () => {
    const results = buildCommandPaletteMatches(
      'port',
      {
        ...empty,
        discussions: [{ id: 'd1', title: 'Porto dinner' }],
        trips: [
          { id: 't1', name: 'Airport run' },
          { id: 't2', name: 'Lisbon to Porto' }
        ]
      },
      hrefs
    );
    expect(results.map((item) => item.id)).toEqual(['chat:d1', 'trip:t2', 'trip:t1']);
  });

  test('matches ideas by their trip name without highlighting the title', () => {
    const results = buildCommandPaletteMatches(
      'summer',
      {
        ...empty,
        ideas: [{ id: 'i1', sourceTripId: 't1', sourceTripName: 'Summer trip', title: 'Coast day' }]
      },
      hrefs
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ detail: 'Summer trip', id: 'idea:i1' });
    expect(results[0]?.highlight).toBeUndefined();
  });

  test('matches agents by label', () => {
    const results = buildCommandPaletteMatches(
      'plan',
      { ...empty, agents: [{ id: 'a1', label: 'Planner', latestRun: null, surface: 'chat' }] },
      hrefs
    );
    expect(results.map((item) => item.id)).toEqual(['agent:a1']);
  });
});
