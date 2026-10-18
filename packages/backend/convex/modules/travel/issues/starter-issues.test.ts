import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import {
  paginationArgs,
  setupGroup,
  setupReviewedTrip,
  setupTrip,
  setupWritableTrip,
  STARTER_ISSUE_COUNT,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';
import { mergeIdea } from '#testing/versions';

const knownDestination = { countryCode: 'PT', name: 'Lisbon, Portugal', status: 'known' as const };

const timeout = 20_000;

const titles = {
  activities: 'Plan something in every destination',
  budget: 'Set a group budget',
  dates: 'Agree on the travel dates',
  days: 'Decide how many days',
  packing: 'Write the packing list',
  stay: 'Book places to stay',
  where: 'Choose where to go'
};

const newStarters = [titles.activities, titles.budget, titles.packing];

const datesBody = 'Settle on an exact start date so everyone can plan around it.';

const reminders: string[] = [titles.activities, titles.budget, titles.packing];
const mandatoryCount = STARTER_ISSUE_COUNT - reminders.length;

/** Only the original four starters are mandatory; the reminders carry no label. */
const expectLabels = (issues: Array<{ labels?: readonly string[]; title: string }>) => {
  for (const issue of issues) {
    expect(issue.labels).toEqual(reminders.includes(issue.title) ? [] : ['mandatory']);
  }
};

async function createTrip(
  owner: Pick<Awaited<ReturnType<typeof setupGroup>>['owner'], 'client'>,
  input: ReturnType<typeof tripInput> & { startDate?: string }
) {
  const tripId = await owner.client.action(api.routes.trips.create.run, { input });
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  return { issues, tripId };
}

test(
  'opens every starter issue for an undecided trip with no dates or duration',
  { timeout },
  async () => {
    const { owner } = await setupGroup();
    const { issues } = await createTrip(owner, tripInput());

    // Lists are newest first, so the intended order is the list order.
    const intended = [
      titles.where,
      titles.dates,
      titles.days,
      titles.stay,
      titles.activities,
      titles.budget,
      titles.packing
    ];
    expect(issues.map((issue) => issue.title)).toEqual(intended);
    // The board orders by rank: ascending rank is the intended top-to-bottom order.
    expect(
      issues.toSorted((left, right) => left.rank - right.rank).map((issue) => issue.title)
    ).toEqual(intended);
    expectLabels(issues);
    for (const issue of issues) {
      expect(issue).toMatchObject({
        assignee: null,
        author: { userId: expect.any(String) },
        closedAt: null,
        idea: null,
        status: 'open'
      });
    }
    expect(issues.find((issue) => issue.title === titles.dates)?.body).toBe(datesBody);
    expect(issues.find((issue) => issue.title === titles.stay)?.body).toBe(
      'Find and book somewhere to stay for every night of the trip.'
    );
  }
);

test('authors starter issues as the trip creator', { timeout }, async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Casey Traveler');
  const { issues, tripId } = await createTrip(member, tripInput());

  const creator = await member.client.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    return trip?.creator.userId;
  });
  expect(issues).toHaveLength(STARTER_ISSUE_COUNT);
  for (const issue of issues) expect(issue.author.userId).toBe(creator);
  expect(issues[0]?.author.name).toBe('Casey Traveler');
  // Group members see the same starters.
  await expect(
    owner.client.query(api.routes.trips.issues.list.run, { tripId })
  ).resolves.toHaveLength(STARTER_ISSUE_COUNT);
});

test.each([
  [
    'known destination',
    tripInput({ destination: knownDestination }),
    [titles.dates, titles.days, titles.stay, ...newStarters]
  ],
  [
    'start date',
    { ...tripInput({ totalDurationDays: 5 }), startDate: '2027-06-01' },
    [titles.where, titles.stay, ...newStarters]
  ],
  [
    'duration',
    tripInput({ idealDurationDays: 7 }),
    [titles.where, titles.dates, titles.stay, ...newStarters]
  ],
  [
    'fully planned trip',
    {
      ...tripInput({ destination: knownDestination, totalDurationDays: 5 }),
      startDate: '2027-06-01'
    },
    [titles.stay, ...newStarters]
  ]
])('skips starters for a %s', { timeout }, async (_name, input, expectedTitles) => {
  const { owner } = await setupGroup();
  const { issues } = await createTrip(owner, input);

  expect(issues.map((issue) => issue.title)).toEqual(expectedTitles);
  expectLabels(issues);
});

test.each([
  ['trimmed date notes', '  Mid September  ', `${datesBody} So far: “Mid September”.`],
  ['blank date notes', '   ', datesBody]
])('words the dates starter for %s', { timeout }, async (_name, dateNotes, body) => {
  const { owner } = await setupGroup();
  const { issues } = await createTrip(owner, tripInput({ dateNotes }));

  expect(issues.find((issue) => issue.title === titles.dates)?.body).toBe(body);
});

test('repeating a create request does not duplicate starter issues', async () => {
  const { owner } = await setupGroup();
  const input = tripInput({ clientRequestId: 'starter-idempotent' });
  const first = await createTrip(owner, input);
  const second = await createTrip(owner, input);

  expect(second.tripId).toBe(first.tripId);
  expect(second.issues).toHaveLength(STARTER_ISSUE_COUNT);
  expect(second.issues.map((issue) => issue.id)).toEqual(first.issues.map((issue) => issue.id));
  await expect(
    owner.client.run((ctx) => ctx.db.query('tripIssues').take(20))
  ).resolves.toHaveLength(STARTER_ISSUE_COUNT);
});

test('does not open starter issues on idea working copies', { timeout }, async () => {
  const { owner, sharedTripId, tripId } = await setupWritableTrip(0);

  await expect(
    owner.client.run((ctx) =>
      ctx.db
        .query('tripIssues')
        .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
        .take(10)
    )
  ).resolves.toEqual([]);
  await expect(
    owner.client.query(api.routes.trips.issues.list.run, { tripId: sharedTripId })
  ).resolves.toHaveLength(STARTER_ISSUE_COUNT);
});

test('presents labels as an empty list for ordinary issues', { timeout }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Need a rainy-day plan.',
    title: 'Rainy-day plan',
    tripId
  });

  const list = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  expect(list.find((issue) => issue.id === issueId)).toMatchObject({ labels: [] });
  expect(list.filter((issue) => issue.id === issueId)).toHaveLength(1);
  expect(list.filter((issue) => issue.labels?.includes('mandatory'))).toHaveLength(mandatoryCount);
  const workspace = await owner.client.query(api.routes.trips.issues.workspace.list.run, {
    ...paginationArgs
  });
  expect(workspace.page.find((issue) => issue.id === issueId)).toMatchObject({ labels: [] });
  expect(workspace.page.filter((issue) => issue.labels?.includes('mandatory'))).toHaveLength(
    mandatoryCount
  );
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({ labels: [] });
});

test('applying an idea started from a starter issue closes that issue', { timeout }, async () => {
  const { owner, reviewer, tripId } = await setupReviewedTrip();
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  const where = issues.find((issue) => issue.title === titles.where);
  if (!where) throw new Error('Expected the destination starter');

  const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
    issueId: where.id,
    tripId
  });
  await owner.client.mutation(api.routes.trips.update.run, {
    input: { currency: 'USD', destination: knownDestination, name: 'Lisbon trip' },
    tripId: version.workingTripId
  });
  await mergeIdea(owner, reviewer, version.proposalId);

  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId: where.id })
  ).resolves.toMatchObject({ labels: ['mandatory'], status: 'closed' });
});

test('creates starter issues for trips committed through commit.create', async () => {
  const { owner } = await setupGroup();
  const tripId = await owner.client.mutation(internal.modules.travel.trips.commit.create, {
    input: tripInput({ destination: knownDestination }),
    signatureValid: true
  });

  const issues = await owner.client.run((ctx) =>
    ctx.db
      .query('tripIssues')
      .withIndex('by_tripId_and_updatedAt', (query) => query.eq('tripId', tripId))
      .order('desc')
      .take(10)
  );
  expect(issues.map((issue) => issue.title)).toEqual([
    titles.dates,
    titles.days,
    titles.stay,
    ...newStarters
  ]);
  expectLabels(issues);
});

test('opens the three reminder starters without a mandatory label', { timeout }, async () => {
  const { owner } = await setupGroup();
  const { issues } = await createTrip(owner, tripInput());

  for (const title of newStarters) {
    expect(issues.find((issue) => issue.title === title)).toMatchObject({
      labels: [],
      status: 'open'
    });
  }
  expect(issues.filter((issue) => issue.labels?.includes('mandatory'))).toHaveLength(
    mandatoryCount
  );
});

test('skips the budget starter when the trip is created with a budget', { timeout }, async () => {
  const { owner } = await setupGroup();
  const { issues } = await createTrip(owner, tripInput({ initialBudget: 2500 }));

  expect(issues.map((issue) => issue.title)).not.toContain(titles.budget);
  expect(issues.map((issue) => issue.title)).toEqual(
    expect.arrayContaining([titles.activities, titles.packing])
  );
  expect(issues).toHaveLength(STARTER_ISSUE_COUNT - 1);
});

type Owner = Awaited<ReturnType<typeof setupReviewedTrip>>['owner'];

const addDestinationWithActivity = async (owner: Owner, tripId: Id<'trips'>) => {
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ dayNumber: 2 }),
    tripId
  });
};

test.each<[string, string, (owner: Owner, workingTripId: Id<'trips'>) => Promise<unknown>]>([
  [
    'a packing item',
    titles.packing,
    (owner, tripId) =>
      owner.client.mutation(api.routes.trips.packing.add.run, { label: 'Sunscreen', tripId })
  ],
  ['an activity in every destination', titles.activities, addDestinationWithActivity],
  [
    'a budget',
    titles.budget,
    (owner, tripId) =>
      owner.client.mutation(api.routes.trips.update.run, {
        input: {
          budget: { amount: 1800 },
          currency: 'USD',
          destination: { status: 'undecided' },
          name: 'Budget trip'
        },
        tripId
      })
  ]
])(
  'applying an idea that adds %s closes the %s starter',
  { timeout },
  async (_name, title, edit) => {
    const { owner, reviewer, tripId } = await setupReviewedTrip();
    const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
    const starter = issues.find((issue) => issue.title === title);
    if (!starter) throw new Error(`Expected the ${title} starter`);
    expect(starter).toMatchObject({ labels: [], status: 'open' });

    const version = await owner.client.mutation(api.routes.trips.versions.create.run, {
      issueId: starter.id,
      tripId
    });
    await edit(owner, version.workingTripId);
    await mergeIdea(owner, reviewer, version.proposalId);

    await expect(
      owner.client.query(api.routes.trips.issues.get.run, { issueId: starter.id })
    ).resolves.toMatchObject({ labels: [], status: 'closed' });
  }
);
