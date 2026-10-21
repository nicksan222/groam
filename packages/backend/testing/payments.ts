import type { Id } from '#convex-generated/dataModel';
import { insertWithShortId } from '#convex/modules/references/index';
import type { createTest } from '#testing/factory';
import { setupTrip, setupWritableTrip } from '#testing/trips';

/** Inspect persisted cleanup results without routing through a deleted organization's auth. */
export function paymentCleanupState(test: ReturnType<typeof createTest>, tripId: Id<'trips'>) {
  return test.run(async (ctx) => ({
    tripExists: (await ctx.db.get('trips', tripId)) !== null,
    payments: await ctx.db
      .query('tripPayments')
      .withIndex('by_tripId_and_userId', (query) => query.eq('tripId', tripId))
      .take(101)
  }));
}

export function paymentReconciliationState(test: ReturnType<typeof createTest>) {
  return test.run((ctx) => ctx.db.query('paymentReconciliations').take(101));
}

/** Explicitly seed invited travelers independently of the current Stripe configuration. */
export async function inviteFixtureTravelers(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Id<'trips'>
) {
  await owner.test.run(async (ctx) => {
    const trip = await ctx.db.get('trips', tripId);
    if (!trip) throw new Error('Expected a fixture trip');
    const travelers = await ctx.db
      .query('tripTravelers')
      .withIndex('by_tripId', (q) => q.eq('tripId', tripId))
      .collect();
    await Promise.all(
      travelers.map((traveler) =>
        ctx.db.patch('tripTravelers', traveler._id, {
          status: traveler.userId === trip.creator.userId ? 'going' : 'invited'
        })
      )
    );
  });
}

export async function setupBillableTrip(additionalMemberCount = 3) {
  const fixture = await setupTrip(additionalMemberCount);
  await inviteFixtureTravelers(fixture.owner, fixture.tripId);
  return fixture;
}

export async function setupBillableWritableTrip(additionalMemberCount = 3) {
  const fixture = await setupWritableTrip(additionalMemberCount);
  await inviteFixtureTravelers(fixture.owner, fixture.sharedTripId);
  return fixture;
}

/** Confirm seats for a bounded, explicit payment/read-budget fixture. */
export async function confirmFixtureSeats(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Id<'trips'>,
  userIds: string[]
) {
  await owner.test.run(async (ctx) => {
    await Promise.all(
      userIds.map((userId) =>
        ctx.db.insert('tripPayments', {
          attempt: 'confirmed-budget-fixture',
          expiresAt: 1,
          paid: true,
          payerId: userId,
          tripId,
          userId
        })
      )
    );
  });
}

/** Copy a real public poll seed into bounded, distinct historical trip/chat scopes. */
export async function seedPrivateTripPollHistory(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  seedPollId: Id<'polls'>,
  additionalCount: number,
  memberCount = 100
) {
  const seed = await owner.test.run(async (ctx) => {
    const poll = await ctx.db.get('polls', seedPollId);
    if (!poll?.tripId || !poll.discussionId) throw new Error('Expected a private trip poll');
    const tripId = poll.tripId;
    const discussionId = poll.discussionId;
    const trip = await ctx.db.get('trips', poll.tripId);
    const discussion = await ctx.db.get('discussions', poll.discussionId);
    const travelers = await ctx.db
      .query('tripTravelers')
      .withIndex('by_tripId', (q) => q.eq('tripId', tripId))
      .take(101);
    const seats = await ctx.db
      .query('tripPayments')
      .withIndex('by_tripId_and_userId', (q) => q.eq('tripId', tripId))
      .take(100);
    const memberships = await ctx.db
      .query('discussionMembers')
      .withIndex('by_discussionId_and_userId', (q) => q.eq('discussionId', discussionId))
      .take(26);
    const votes = await ctx.db
      .query('pollVotes')
      .withIndex('by_pollId_and_userId', (q) => q.eq('pollId', seedPollId))
      .take(2);
    if (
      !trip ||
      discussion?.kind !== 'group' ||
      travelers.length !== memberCount ||
      seats.length !== memberCount - 1 ||
      memberships.length !== Math.min(25, memberCount - 1) ||
      votes.length !== 1 ||
      !votes[0]
    ) {
      throw new Error(
        'Expected the complete roster, paid seats, private audience and one real vote'
      );
    }
    return { trip, discussion, poll, travelers, seats, memberships, vote: votes[0] };
  });
  const pollIds = [seedPollId];
  for (let index = 0; index < additionalCount; index += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Each ordered transaction seeds only one 100-member trip, keeping fixture I/O bounded.
    const pollId = await owner.test.run(async (ctx) => {
      const { _id: _tripId, _creationTime: _tripTime, ...trip } = seed.trip;
      const tripId = await insertWithShortId(ctx, 'trips', trip);
      const { _id: _chatId, _creationTime: _chatTime, ...discussion } = seed.discussion;
      const discussionId = await insertWithShortId(ctx, 'discussions', {
        ...discussion,
        clientRequestId: crypto.randomUUID(),
        tripId
      });
      const { _id: _pollId, _creationTime: _pollTime, ...poll } = seed.poll;
      const pollId = await ctx.db.insert('polls', { ...poll, discussionId, tripId });
      const { _id: _voteId, _creationTime: _voteTime, ...vote } = seed.vote;
      await Promise.all([
        ...seed.travelers.map(({ _id, _creationTime, ...row }) =>
          ctx.db.insert('tripTravelers', { ...row, tripId })
        ),
        ...seed.seats.map(({ _id, _creationTime, ...row }) =>
          ctx.db.insert('tripPayments', { ...row, tripId })
        ),
        ...seed.memberships.map(({ _id, _creationTime, ...row }) =>
          ctx.db.insert('discussionMembers', { ...row, discussionId })
        ),
        ctx.db.insert('pollVotes', { ...vote, pollId })
      ]);
      return pollId;
    });
    pollIds.unshift(pollId);
  }
  return pollIds;
}
