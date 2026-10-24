import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import {
  openTripDraft,
  setupWritableTrip,
  tripActivityInput,
  tripLocationInput
} from '#testing/trips';
import { mergeIdea, type TripOwner } from '#testing/versions';

/**
 * A shared trip, built through an idea and merged: two stops with a transfer between them, two
 * activities with a transfer between them, a stay, and an arrival and a departure.
 */
async function setupPlannedTrip() {
  const trip = await setupWritableTrip(1);
  const { owner, sharedTripId, tripId: workingTripId } = trip;
  const [reviewer] = trip.users;
  if (!reviewer) throw new Error('Expected a reviewer');
  const lisbon = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, name: 'Lisbon', placeId: 'p-lisbon', startDay: 1 }),
    tripId: workingTripId
  });
  const porto = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 5, name: 'Porto', placeId: 'p-porto', startDay: 4 }),
    tripId: workingTripId
  });
  const addActivity = (title: string, dayNumber: number) =>
    owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId: lisbon,
      input: tripActivityInput({ dayNumber, startTime: '10:00', title }),
      tripId: workingTripId
    });
  const fado = await addActivity('Fado night', 2);
  const museum = await addActivity('Museum', 2);
  await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId: lisbon,
    input: { schedule: { checkInDay: 1, checkOutDay: 3 }, title: 'Casa do Pátio' },
    tripId: workingTripId
  });
  await owner.client.mutation(api.routes.trips.destinations.activities.transfers.set.run, {
    fromActivityId: fado,
    input: { mode: 'taxi', timing: { startDay: 2, startTime: '11:00' } },
    toActivityId: museum,
    tripId: workingTripId
  });
  await owner.client.mutation(api.routes.trips.destinations.transfers.set.run, {
    fromDestinationId: lisbon,
    input: { mode: 'train', timing: { startDay: 3, startTime: '09:00' } },
    toDestinationId: porto,
    tripId: workingTripId
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'arrival',
    input: { mode: 'flight', timing: { startDay: 1, startTime: '07:00' } },
    tripId: workingTripId
  });
  await owner.client.mutation(api.routes.trips.transfers.set.run, {
    boundary: 'departure',
    input: { mode: 'public_transit' },
    tripId: workingTripId
  });
  await mergeIdea(owner, reviewer, trip.proposalId);
  const shared = await owner.client.query(api.routes.trips.get.run, { tripId: sharedTripId });
  const [first, second] = shared?.destinations ?? [];
  const [fadoNight, museumVisit] = first?.activities ?? [];
  const stay = first?.stays[0];
  if (!first || !second || !fadoNight || !museumVisit || !stay) throw new Error('Expected a plan');
  if (!fadoNight.transferToNext || !first.transferToNext) throw new Error('Expected transfers');
  if (!shared?.arrivalTransfer || !shared.departureTransfer) throw new Error('Expected journeys');
  return {
    ...trip,
    activityId: fadoNight.id,
    activityTransferId: fadoNight.transferToNext.id,
    arrivalId: shared.arrivalTransfer.id,
    departureId: shared.departureTransfer.id,
    destinationId: first.id,
    destinationTransferId: first.transferToNext.id,
    reviewer,
    stayId: stay.id,
    workingActivityId: fado
  };
}

const raise = (owner: TripOwner, tripId: Parameters<typeof openTripDraft>[1], subject: unknown) =>
  owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Is this still on?',
    subject: subject as never,
    title: 'A question',
    tripId
  });

async function aboutOf(
  owner: TripOwner,
  tripId: Parameters<typeof openTripDraft>[1],
  subject: unknown
) {
  const issueId = await raise(owner, tripId, subject);
  const issue = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  return issue?.about;
}

test(
  'about names each kind of plan item and the day it starts on',
  { timeout: 60_000 },
  async () => {
    const plan = await setupPlannedTrip();
    const { owner, sharedTripId } = plan;
    const about = (id: string, type: string) => aboutOf(owner, sharedTripId, { id, type });
    expect(await about(plan.activityId, 'activity')).toEqual({
      day: 2,
      id: plan.activityId,
      label: 'Fado night',
      type: 'activity'
    });
    expect(await about(plan.stayId, 'stay')).toMatchObject({ day: 1, label: 'Casa do Pátio' });
    expect(await about(plan.destinationId, 'destination')).toMatchObject({
      day: 1,
      label: 'Lisbon'
    });
    expect(await about(plan.activityTransferId, 'activity_transfer')).toMatchObject({
      day: 2,
      label: 'Taxi · Fado night → Museum'
    });
    expect(await about(plan.destinationTransferId, 'destination_transfer')).toMatchObject({
      day: 3,
      label: 'Train · Lisbon → Porto'
    });
    expect(await about(plan.arrivalId, 'boundary_transfer')).toMatchObject({
      day: 1,
      label: 'Flight · Arrival → Lisbon'
    });
    expect(await about(plan.departureId, 'boundary_transfer')).toMatchObject({
      label: 'Public transit · Porto → Departure'
    });
  }
);

test('a transfer with no timing has no day', { timeout: 60_000 }, async () => {
  const plan = await setupPlannedTrip();
  expect(
    await aboutOf(plan.owner, plan.sharedTripId, {
      id: plan.departureId,
      type: 'boundary_transfer'
    })
  ).toMatchObject({ day: null });
});

test(
  'an issue without a subject has no about and no missing item',
  { timeout: 60_000 },
  async () => {
    const { owner, sharedTripId } = await setupPlannedTrip();
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Body',
      title: 'Plain',
      tripId: sharedTripId
    });
    await expect(
      owner.client.query(api.routes.trips.issues.get.run, { issueId })
    ).resolves.toMatchObject({ about: null, subjectMissing: false });
  }
);

test('refuses an item from another trip', { timeout: 60_000 }, async () => {
  const { owner, sharedTripId, workingActivityId } = await setupPlannedTrip();
  await expect(
    raise(owner, sharedTripId, { id: workingActivityId, type: 'activity' })
  ).rejects.toThrow('Trip target not found');
});

test('refuses an id from the wrong table', { timeout: 60_000 }, async () => {
  const { owner, sharedTripId, stayId } = await setupPlannedTrip();
  await expect(raise(owner, sharedTripId, { id: stayId, type: 'activity' })).rejects.toThrow();
});

test('refuses a subject on an archived trip', { timeout: 60_000 }, async () => {
  const { activityId, owner, sharedTripId } = await setupPlannedTrip();
  await owner.client.mutation(api.routes.trips.archive.run, { tripId: sharedTripId });
  await expect(raise(owner, sharedTripId, { id: activityId, type: 'activity' })).rejects.toThrow(
    'Archived trips are read-only'
  );
});

test('refuses a subject on an idea working copy', { timeout: 60_000 }, async () => {
  const { owner, workingActivityId, tripId } = await setupPlannedTrip();
  await expect(raise(owner, tripId, { id: workingActivityId, type: 'activity' })).rejects.toThrow(
    'Create issues on the shared trip'
  );
});

test('about turns null once the item is deleted', { timeout: 60_000 }, async () => {
  const { activityId, owner, reviewer, sharedTripId } = await setupPlannedTrip();
  const issueId = await raise(owner, sharedTripId, { id: activityId, type: 'activity' });
  const draft = await openTripDraft(owner, sharedTripId);
  const copy = await owner.client.query(api.routes.trips.get.run, { tripId: draft.workingTripId });
  const copied = copy?.destinations[0]?.activities[0];
  if (!copied) throw new Error('Expected the activity on the new working copy');
  await owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
    activityId: copied.id,
    tripId: draft.workingTripId
  });
  await mergeIdea(owner, reviewer, draft.proposalId);
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({ about: null, subjectMissing: true, title: 'A question' });
});

test('a description is optional', { timeout: 60_000 }, async () => {
  const { activityId, owner, sharedTripId } = await setupPlannedTrip();
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: '',
    subject: { id: activityId, type: 'activity' },
    title: 'Is it open?',
    tripId: sharedTripId
  });
  await expect(
    owner.client.query(api.routes.trips.issues.get.run, { issueId })
  ).resolves.toMatchObject({ body: '' });
});
