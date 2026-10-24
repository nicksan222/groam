import { describe, expect, test } from 'vite-plus/test';
import { buildCommandPaletteMatches, type CommandPaletteSource } from './command-palette-results';

type Idea = { id: string; title: string };

const hrefs = {
  ideaHref: (idea: Idea) => ({
    params: { proposalId: idea.id, tripId: 't-current', view: 'compare' },
    to: '/trips/$tripId/ideas/$proposalId/$view'
  })
};

const empty: CommandPaletteSource<Idea> = {
  current: null,
  discussions: [],
  ideas: [],
  issues: [],
  section: null,
  trips: []
};

const onTrip: CommandPaletteSource<Idea> = {
  ...empty,
  current: { id: 't-current', reference: 'kyoto1' },
  section: 'packing'
};

const groupsOf = (results: ReturnType<typeof buildCommandPaletteMatches>) => [
  ...new Set(results.map((item) => item.group))
];

describe('buildCommandPaletteMatches', () => {
  test('browses the current trip: sections, then its ideas and issues, then the other trips', () => {
    const results = buildCommandPaletteMatches(
      '',
      {
        ...onTrip,
        ideas: [{ id: 'i1', title: 'Coast day' }],
        issues: [{ id: 'is1', title: 'Visa rules' }],
        trips: [
          { id: 't-current', name: 'Kyoto', shortId: 'kyoto1' },
          { id: 't2', name: 'Lisbon', shortId: 'lis2' }
        ]
      },
      hrefs
    );
    expect(groupsOf(results)).toEqual(['Go to', 'Ideas', 'Issues', 'Switch to']);
    // Every section but the one on screen (Packing), uncapped, in reading order.
    expect(results.filter((item) => item.group === 'Go to').map((item) => item.label)).toEqual([
      'Plan',
      'Calendar',
      'Map',
      'Ideas',
      'Issues',
      'Polls',
      'Research',
      'Activity',
      'People'
    ]);
    expect(results.at(-1)).toMatchObject({ id: 'trip:t2', label: 'Lisbon' });
    expect(results.map((item) => item.id)).not.toContain('trip:t-current');
  });

  test('links sections with the trip reference', () => {
    const results = buildCommandPaletteMatches('calendar', onTrip, hrefs);
    expect(results[0]).toMatchObject({
      group: 'Go to',
      href: { params: { section: 'calendar', tripId: 'kyoto1' }, to: '/trips/$tripId/$section' },
      label: 'Calendar'
    });
  });

  test('leaves the section on screen out of Go to, browsing or searching', () => {
    expect(buildCommandPaletteMatches('', onTrip, hrefs).map((item) => item.id)).not.toContain(
      'section:packing'
    );
    expect(buildCommandPaletteMatches('packing', onTrip, hrefs)).toEqual([]);
  });

  test('caps Go to only while searching', () => {
    const results = buildCommandPaletteMatches('a', { ...onTrip, section: null }, hrefs);
    expect(results.filter((item) => item.group === 'Go to').length).toBeLessThanOrEqual(6);
    expect(
      buildCommandPaletteMatches('', { ...onTrip, section: null }, hrefs).filter(
        (item) => item.group === 'Go to'
      )
    ).toHaveLength(10);
  });

  test('"iss" ranks the Issues section in the top group', () => {
    const results = buildCommandPaletteMatches(
      'iss',
      {
        ...onTrip,
        issues: [{ id: 'is1', title: 'Missing visa' }]
      },
      hrefs
    );
    expect(results[0]).toMatchObject({ group: 'Go to', label: 'Issues', highlight: [0, 3] });
    expect(groupsOf(results)).toEqual(['Go to', 'Issues']);
  });

  test('off a trip there is no Go to group and every trip is under Trips', () => {
    const results = buildCommandPaletteMatches(
      '',
      {
        ...empty,
        discussions: [{ id: 'd1', title: 'Flights' }],
        trips: [
          { id: 't2', name: 'lisbon' },
          { id: 't1', name: 'Kyoto' }
        ]
      },
      hrefs
    );
    expect(groupsOf(results)).toEqual(['Trips', 'Chats']);
    expect(results.map((item) => item.id)).toEqual(['trip:t1', 'trip:t2', 'chat:d1']);
    expect(buildCommandPaletteMatches('plan', empty, hrefs)).toEqual([]);
  });

  test('switching trips keeps the section and prefers the short id', () => {
    const results = buildCommandPaletteMatches(
      'lisbon',
      {
        ...onTrip,
        trips: [
          { id: 't2', name: 'Lisbon', shortId: 'lis2' },
          { id: 't3', name: 'Lisbon long id' }
        ]
      },
      hrefs
    );
    expect(results.map((item) => item.href)).toEqual([
      { params: { section: 'packing', tripId: 'lis2' }, to: '/trips/$tripId/$section' },
      { params: { section: 'packing', tripId: 't3' }, to: '/trips/$tripId/$section' }
    ]);
  });

  test('a trip switched to from outside a trip section opens Plan', () => {
    const [result] = buildCommandPaletteMatches(
      'lis',
      { ...onTrip, section: null, trips: [{ id: 't2', name: 'Lisbon', shortId: 'lis2' }] },
      hrefs
    );
    expect(result?.href).toMatchObject({ params: { section: 'plan', tripId: 'lis2' } });
  });

  test('uses the idea href supplied for this trip', () => {
    const [result] = buildCommandPaletteMatches(
      'coast',
      { ...onTrip, ideas: [{ id: 'i1', title: 'Coast day' }] },
      hrefs
    );
    expect(result).toMatchObject({
      group: 'Ideas',
      href: { params: { proposalId: 'i1', tripId: 't-current' } }
    });
  });

  test("this trip's chats lead at equal score", () => {
    const results = buildCommandPaletteMatches(
      '',
      {
        ...onTrip,
        discussions: [
          { id: 'd1', title: 'Airport', tripId: 't-other' },
          { id: 'd2', title: 'Zoo plans', tripId: 't-current' },
          { id: 'd3', title: 'Bank', tripId: null }
        ]
      },
      hrefs
    );
    const chats = results.filter((item) => item.group === 'Chats').map((item) => item.id);
    expect(chats).toEqual(['chat:d2', 'chat:d1', 'chat:d3']);
  });

  test('a better match still beats a chat from this trip', () => {
    const results = buildCommandPaletteMatches(
      'port',
      {
        ...onTrip,
        discussions: [
          { id: 'd1', title: 'Airport run', tripId: 't-current' },
          { id: 'd2', title: 'Porto dinner', tripId: 't-other' }
        ]
      },
      hrefs
    );
    expect(results.map((item) => item.id)).toEqual(['chat:d2', 'chat:d1']);
  });

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
});
