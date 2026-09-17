import type { TripCurrency } from '#convex/modules/travel/trips/currencies';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { createAuthenticatedTest, createTestUser } from '#testing/factory';

export const paginationArgs = { paginationOpts: { cursor: null, numItems: 25 } };

function requireAuthResult<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result.error || result.data === null) throw new Error(result.error?.message ?? 'Auth failed');
  return result.data;
}

export async function setupGroup() {
  const owner = await createAuthenticatedTest({
    email: `owner-${crypto.randomUUID()}@example.com`,
    organization: { name: 'Beach Friends' }
  });
  const organizationId = owner.organizationId;
  if (!organizationId) throw new Error('Expected an organization');

  const addUser = async (name: string, role: 'admin' | 'member' = 'member') => {
    const email = `${name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}-${crypto.randomUUID()}@example.com`;
    const user = await createTestUser(owner.test, { email, name });
    const invitation = await owner.client.mutation(
      api.routes.organizations.invitations.create.run,
      { role }
    );
    await user.client.mutation(api.routes.organizations.invitations.redeem.run, {
      code: invitation.code
    });
    requireAuthResult(await user.authClient.organization.setActive({ organizationId }));
    return user;
  };

  return { addUser, owner };
}

export async function setupTransferEndpoints(
  owner: Awaited<ReturnType<typeof createAuthenticatedTest>>,
  tripId: Id<'trips'>,
  secondPlaceId = 'transfer-second-stop'
) {
  const firstDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput(),
    tripId
  });
  const secondDestinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Second stop', placeId: secondPlaceId }),
    tripId
  });
  const firstActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    { destinationId: firstDestinationId, input: tripActivityInput(), tripId }
  );
  const secondActivityId = await owner.client.mutation(
    api.routes.trips.destinations.activities.add.run,
    {
      destinationId: firstDestinationId,
      input: tripActivityInput({ title: 'Second activity' }),
      tripId
    }
  );
  return { firstActivityId, firstDestinationId, secondActivityId, secondDestinationId };
}

export async function approveTestTrip(
  owner: Awaited<ReturnType<typeof createAuthenticatedTest>>,
  tripId: Id<'trips'>
) {
  await owner.client.mutation(api.routes.trips.update.run, {
    input: {
      currency: 'EUR',
      dateNotes: 'Early September',
      destination: tripLocationInput(),
      name: 'Portugal by train'
    },
    tripId
  });
}

export function tripInput(
  overrides: Partial<{
    clientRequestId: string;
    currency: TripCurrency;
    dateNotes: string;
    destination:
      | ReturnType<typeof tripLocationInput>
      | { countryCode?: string; name: string; status: 'known' }
      | { status: 'undecided' };
    idealDurationDays: number;
    initialBudget: number;
    minimumDurationDays: number;
    name: string;
    totalDurationDays: number;
  }> = {}
) {
  const {
    idealDurationDays,
    initialBudget,
    minimumDurationDays,
    totalDurationDays,
    ...information
  } = overrides;
  const duration = {
    ...(idealDurationDays === undefined ? {} : { idealDays: idealDurationDays }),
    ...(minimumDurationDays === undefined ? {} : { minimumDays: minimumDurationDays }),
    ...(totalDurationDays === undefined ? {} : { totalDays: totalDurationDays })
  };
  return {
    clientRequestId: crypto.randomUUID(),
    currency: 'USD' as const,
    destination: { status: 'undecided' as const },
    name: 'Summer beach idea',
    ...(initialBudget === undefined ? {} : { budget: { amount: initialBudget } }),
    ...(Object.keys(duration).length === 0 ? {} : { duration }),
    ...information
  };
}

export function tripActivityInput(
  overrides: Partial<{
    address: string;
    attachmentIds: Id<'media'>[];
    dayNumber: number;
    endDayNumber: number;
    endTime: string;
    notes: string;
    startTime: string;
    timeBlock: 'full_day' | 'morning' | 'afternoon' | 'evening';
    title: string;
  }> = {}
) {
  const {
    dayNumber = 1,
    endDayNumber,
    endTime,
    startTime,
    timeBlock = 'morning',
    ...details
  } = overrides;
  return {
    notes: 'Book ahead',
    schedule: {
      day: dayNumber,
      ...(endDayNumber === undefined ? {} : { endDay: endDayNumber }),
      ...(endTime === undefined ? {} : { endTime }),
      ...(startTime === undefined ? {} : { startTime }),
      timeBlock
    },
    title: 'Walking tour',
    ...details
  };
}

export function tripLocationInput(
  overrides: Partial<{
    countryCode: string;
    dayNotes: string;
    endDay: number;
    latitude: number;
    longitude: number;
    name: string;
    placeId: string;
    startDay: number;
  }> = {}
) {
  const { endDay, latitude = 38.707_751, longitude = -9.136_592, startDay, ...details } = overrides;
  return {
    coordinates: { latitude, longitude },
    countryCode: 'PT',
    name: 'Lisbon, Portugal',
    placeId: 'R:5400890',
    ...(startDay === undefined || endDay === undefined ? {} : { schedule: { endDay, startDay } }),
    status: 'known' as const,
    ...details
  };
}

export async function openTripDraft(
  owner: Pick<Awaited<ReturnType<typeof createAuthenticatedTest>>, 'client'>,
  tripId: Id<'trips'>,
  options?: { ideaName?: string; title?: string }
) {
  return await owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId,
    ...options
  });
}

export async function setupTrip(additionalMemberCount = 3) {
  const group = await setupGroup();
  const users = await Promise.all(
    Array.from({ length: additionalMemberCount }, (_, index) =>
      group.addUser(`Group member ${index + 1}`)
    )
  );
  const tripId = await group.owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  return { ...group, tripId, users };
}

export async function setupWritableTrip(additionalMemberCount = 3) {
  const trip = await setupTrip(additionalMemberCount);
  const version = await openTripDraft(trip.owner, trip.tripId);
  return {
    ...trip,
    proposalId: version.proposalId,
    sharedTripId: trip.tripId,
    tripId: version.workingTripId,
    version
  };
}
