import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupReviewedTrip } from '#testing/trips';
import { draftChangedVersion } from '#testing/versions';

test(
  'assistant approval and RSVP writes act as the calling traveler',
  { timeout: 30_000 },
  async () => {
    const { owner, reviewer, tripId } = await setupReviewedTrip();
    const version = await draftChangedVersion(owner, tripId);
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: version.proposalId
    });
    await reviewer.client.mutation(
      internal.modules.assistant.model.proposals.setTripVersionApproval,
      {
        approved: true,
        proposalId: version.proposalId
      }
    );
    await owner.client.action(api.routes.trips.versions.merge.run, {
      proposalId: version.proposalId
    });
    await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
      name: 'Lisbon proposal'
    });

    await reviewer.client.mutation(internal.modules.assistant.model.proposals.setTravelerRsvp, {
      status: 'maybe',
      tripId
    });
    const travelers = await owner.client.query(api.routes.trips.travelers.list.run, { tripId });
    expect(travelers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: reviewer.userId, status: 'maybe' })
      ])
    );

    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.mutation(internal.modules.assistant.model.proposals.setTravelerRsvp, {
        status: 'going',
        tripId
      })
    ).rejects.toThrow('Trip not found');
  }
);
