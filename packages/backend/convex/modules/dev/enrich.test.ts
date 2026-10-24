import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { setupGroup, tripInput, tripLocationInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test(
  'enriches local trips with connected research, decisions, bookings and packing without duplicates',
  { timeout: 30_000 },
  async () => {
    vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
    const { owner } = await setupGroup();
    const tripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ destination: tripLocationInput(), totalDurationDays: 5 })
    });
    const input = { tripId, scenarioIndex: 2 };
    await expect(owner.client.mutation(api.routes.trips.seed.enrich.run, input)).resolves.toEqual({
      archived: false,
      ideas: 2,
      issues: 4,
      packingItems: 4,
      researches: 3,
      stays: 1
    });
    await expect(owner.client.mutation(api.routes.trips.seed.enrich.run, input)).resolves.toEqual({
      archived: false,
      ideas: 0,
      issues: 0,
      packingItems: 0,
      researches: 0,
      stays: 0
    });
    const researches = await owner.client.query(api.routes.discussions.research.list.run, {
      tripId,
      kind: 'research'
    });
    expect(researches).toHaveLength(3);
    const stayResearch = researches.find((research) =>
      research.title.startsWith('Accessible stays')
    );
    if (!stayResearch) throw new Error('Expected accommodation research');
    const report = await owner.client.query(internal.modules.discussions.research.tools.read, {
      discussionId: stayResearch.id
    });
    expect(report.links.map((link) => link.kind).toSorted()).toEqual([
      'destination',
      'idea',
      'issue',
      'stay'
    ]);
    expect(report.latestReport?.report).toContain('No web search or model execution was performed');
    expect(report.latestReport?.sources).toEqual([
      { title: 'Booking.com — accommodation discovery', url: 'https://www.booking.com/' }
    ]);
    expect(report.messages).toHaveLength(1);
    expect(report.latestReport?.report).toContain('| Stay profile |');
    expect(report.latestReport?.report).not.toContain('\\n');
    await expect(
      owner.client.query(api.routes.discussions.research.latest.run, {
        discussionId: stayResearch.id
      })
    ).resolves.toMatchObject({ status: 'complete', researchTask: { effort: 'deep' } });
    const weatherResearch = researches.find((research) =>
      research.title.startsWith('Weather backup')
    );
    if (!weatherResearch) throw new Error('Expected weather research');
    await expect(
      owner.client.query(api.routes.discussions.research.latest.run, {
        discussionId: weatherResearch.id
      })
    ).resolves.toMatchObject({ status: 'failed', error: expect.stringContaining('simulated') });
    const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
    for (const status of ['open', 'in_progress', 'closed', 'wont_do'])
      expect(issues.some((issue) => issue.status === status)).toBe(true);
    const arrivalIssue = issues.find(
      (issue) => issue.title === 'Confirm the last-mile arrival plan'
    );
    if (!arrivalIssue) throw new Error('Expected arrival issue');
    await owner.client.mutation(api.routes.trips.issues.status.run, {
      issueId: arrivalIssue.id,
      status: 'wont_do'
    });
    await owner.client.mutation(api.routes.discussions.research.update.run, {
      discussionId: stayResearch.id,
      brief: 'Traveler-edited brief: a quiet room is essential.'
    });
    await owner.client.mutation(api.routes.trips.seed.enrich.run, input);
    const preservedIssues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
    expect(preservedIssues.find((issue) => issue.id === arrivalIssue.id)?.status).toBe('wont_do');
    const preservedResearch = await owner.client.query(
      internal.modules.discussions.research.tools.read,
      { discussionId: stayResearch.id }
    );
    expect(preservedResearch.brief).toBe('Traveler-edited brief: a quiet room is essential.');
    expect(preservedResearch.latestReport).toEqual(report.latestReport);
    const packing = await owner.client.query(api.routes.trips.packing.list.run, { tripId });
    expect(packing).toHaveLength(4);
    expect(packing.filter((item) => item.brought > 0)).toHaveLength(2);
    const ideas = await owner.client.query(api.routes.trips.versions.list.run, { tripId });
    expect(ideas.map((idea) => idea.status).toSorted()).toEqual(['closed', 'draft']);
    const draft = ideas.find((idea) => idea.status === 'draft');
    if (!draft) throw new Error('Expected real draft idea');
    const detail = await owner.client.query(api.routes.trips.versions.get.run, {
      proposalId: draft.id
    });
    expect(
      detail.changes.some((change) => change.entity === 'activity' && change.change === 'added')
    ).toBe(true);
    const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
    expect(trip.destinations[0]?.stays).toHaveLength(1);
  }
);

test(
  'local enrichment refuses hosted deployments, anonymous viewers, participants, and invalid scenario indices',
  { timeout: 30_000 },
  async () => {
    const { owner, addUser } = await setupGroup();
    const participant = await addUser('Participant');
    const tripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ destination: tripLocationInput() })
    });
    const input = { tripId, scenarioIndex: 0 };
    vi.stubEnv('CONVEX_SITE_URL', 'https://example.convex.site');
    await expect(owner.client.mutation(api.routes.trips.seed.enrich.run, input)).rejects.toThrow(
      'only available in local development'
    );
    vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
    await expect(owner.test.mutation(api.routes.trips.seed.enrich.run, input)).rejects.toThrow();
    await expect(
      participant.client.mutation(api.routes.trips.seed.enrich.run, input)
    ).rejects.toThrow('permission');
    await expect(
      owner.client.mutation(api.routes.trips.seed.enrich.run, { ...input, scenarioIndex: -1 })
    ).rejects.toThrow('Invalid seed scenario index');
  }
);

test(
  'adds an authentic shared planning chat and voted poll, then preserves them on reruns and skips archives',
  { timeout: 30_000 },
  async () => {
    vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
    const { owner, addUser } = await setupGroup();
    await addUser('Alex');
    const tripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ destination: tripLocationInput(), totalDurationDays: 5 })
    });
    const input = { tripId, scenarioIndex: 0 };
    await owner.client.mutation(api.routes.trips.seed.enrich.run, input);
    await owner.client.mutation(api.routes.trips.seed.enrich.run, input);
    const chats = await owner.client.query(api.routes.discussions.list.run, {});
    expect(chats.filter((chat) => chat.tripId === tripId)).toHaveLength(1);
    const polls = await owner.client.query(api.routes.polls.list.trip.run, {
      tripId,
      status: 'closed',
      paginationOpts: { cursor: null, numItems: 25 }
    });
    expect(polls.page).toHaveLength(1);
    expect(polls.page[0]).toMatchObject({ votedCount: 1, myOptionIds: ['o1'] });
    await owner.client.mutation(api.routes.trips.archive.run, { tripId });
    await expect(owner.client.mutation(api.routes.trips.seed.enrich.run, input)).resolves.toEqual({
      archived: true,
      ideas: 0,
      issues: 0,
      packingItems: 0,
      researches: 0,
      stays: 0
    });
  }
);

test(
  'uses realistic nominal yen prices across bookings, transfers and idea activities',
  { timeout: 30_000 },
  async () => {
    vi.stubEnv('CONVEX_SITE_URL', 'http://127.0.0.1:3211');
    const { owner } = await setupGroup();
    const tripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({
        destination: tripLocationInput({ name: 'Kyoto, Japan' }),
        currency: 'JPY',
        totalDurationDays: 5
      })
    });
    await owner.client.mutation(internal.modules.dev.populate.write, {
      tripId,
      activities: [],
      primary: { startDay: 1, endDay: 3 },
      additionalDestinations: [
        tripLocationInput({
          name: 'Osaka, Japan',
          placeId: 'seed-osaka',
          latitude: 34.6937,
          longitude: 135.5023,
          startDay: 3,
          endDay: 5
        })
      ]
    });
    await owner.client.mutation(api.routes.trips.seed.enrich.run, { tripId, scenarioIndex: 2 });
    const trip = await owner.client.query(api.routes.trips.get.run, { tripId });
    expect(trip.destinations[0]?.stays[0]?.costAmount).toBeGreaterThan(10_000);
    expect(trip.arrivalTransfer?.costAmount).toBe(1920);
    expect(trip.destinations[0]?.stays[0]?.checkOutDay).toBe(
      trip.destinations[1]?.stays[0]?.checkInDay
    );
    expect(trip.destinations[1]?.stays[0]?.checkOutDay).toBe(5);
    const ideas = await owner.client.query(api.routes.trips.versions.list.run, { tripId });
    const draft = ideas.find((idea) => idea.status === 'draft');
    if (!draft) throw new Error('Expected draft');
    const working = await owner.client.query(api.routes.trips.get.run, {
      tripId: draft.workingTripId
    });
    expect(
      working.destinations[0]?.activities.find(
        (activity) => activity.title === 'Unhurried neighborhood walk and cafe stop'
      )?.costAmount
    ).toBe(2880);
  }
);
