import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

const model = internal.modules.assistant.model.index;
const workspaceScreen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

test('tagged context loads details for each tagged trip target', { timeout: 30_000 }, async () => {
  const draft = await setupWritableTrip(0);
  const stopId = await draft.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 2, name: 'Porto', placeId: 'porto', startDay: 1 }),
    tripId: draft.tripId
  });
  const activityId = await draft.owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: stopId,
      input: tripActivityInput({ title: 'Cellar tour' }),
      tripId: draft.tripId
    }
  );
  await draft.owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId: stopId,
    input: { schedule: { checkInDay: 1, checkOutDay: 2 }, title: 'Hotel Douro' },
    tripId: draft.tripId
  });
  const threadId = await draft.owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });
  const tags = await draft.owner.client.mutation(api.routes.assistant.chats.tags.run, {
    tags: [
      { id: draft.tripId, kind: 'trip' },
      { id: stopId, kind: 'destination' },
      { id: activityId, kind: 'activity' },
      { id: activityId, kind: 'activity' }
    ],
    threadId
  });
  expect(tags.map((tag) => tag.kind)).toEqual(['trip', 'destination', 'activity']);

  const context = await draft.owner.client.query(model.taggedContext, { threadId });
  expect(context.map((entry) => [entry.kind, entry.label])).toEqual([
    ['trip', expect.any(String)],
    ['destination', 'Porto'],
    ['activity', 'Cellar tour']
  ]);
  expect(JSON.parse(context[1]!.details)).toMatchObject({
    endDay: 2,
    name: 'Porto',
    scheduledActivities: [{ day: 1, title: 'Cellar tour' }],
    startDay: 1
  });
  expect(JSON.parse(context[2]!.details)).toMatchObject({ title: 'Cellar tour' });

  const outsider = await createOutsiderClient(draft.owner.test);
  await expect(outsider.client.query(model.taggedContext, { threadId })).rejects.toThrow(
    'Assistant conversation not found'
  );
  const member = await draft.addUser('Member');
  await expect(member.client.query(model.taggedContext, { threadId })).rejects.toThrow(
    'Assistant conversation not found'
  );
});

test(
  'assistant issue and date writes respect the draft boundary',
  { timeout: 30_000 },
  async () => {
    const { owner, sharedTripId, tripId } = await setupWritableTrip(0);
    const issueId = await owner.client.mutation(model.createTripIssue, {
      body: 'Find a dinner spot.',
      title: 'Dinner',
      tripId: sharedTripId
    });
    await expect(
      owner.client.query(api.routes.trips.issues.get.run, { issueId })
    ).resolves.toMatchObject({ title: 'Dinner' });

    await expect(
      owner.client.mutation(model.setTripVersionDates, {
        endDate: '2027-05-04',
        startDate: '2027-05-01',
        tripId: sharedTripId
      })
    ).rejects.toThrow('Only a draft idea can be written to');
    await owner.client.mutation(model.setTripVersionDates, {
      endDate: '2027-05-04',
      startDate: '2027-05-01',
      tripId
    });
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      startDate: '2027-05-01'
    });
  }
);
