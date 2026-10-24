import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';
import { draftChangedVersion, mergeIdea } from '#testing/versions';

async function setup(requiredApprovals = 1) {
  const trip = await setupTrip(2);
  const [reviewer, secondReviewer] = trip.users;
  if (!(reviewer && secondReviewer)) throw new Error('Expected two reviewers');
  if (requiredApprovals > 1) {
    await trip.owner.client.mutation(api.routes.settings.reviews.set.run, { requiredApprovals });
  }
  const { proposalId } = await draftChangedVersion(trip.owner, trip.tripId);
  type Client = typeof trip.owner.client;
  const listed = async (client: Client) => {
    const [item] = await client.query(api.routes.trips.versions.list.run, { tripId: trip.tripId });
    return item;
  };
  const expectAgreement = async (client: Client) => {
    const item = await listed(client);
    const detail = await client.query(api.routes.trips.versions.get.run, { proposalId });
    expect({
      canApprove: item?.canApprove,
      canMerge: item?.canMerge,
      hasApproved: item?.hasApproved
    }).toEqual({
      canApprove: detail.canApprove,
      canMerge: detail.canMerge,
      hasApproved: detail.hasApproved
    });
    return item;
  };
  const submit = () =>
    trip.owner.client.action(api.routes.trips.versions.submit.run, { proposalId });
  const approve = (client: Client) =>
    client.mutation(api.routes.trips.versions.approval.run, { approved: true, proposalId });
  return {
    ...trip,
    approve,
    expectAgreement,
    listed,
    proposalId,
    reviewer,
    secondReviewer,
    submit
  };
}

test('lists the same review capabilities as the idea detail', { timeout: 30_000 }, async () => {
  const { approve, expectAgreement, owner, reviewer, submit } = await setup();

  expect(await expectAgreement(owner.client)).toMatchObject({
    canApprove: false,
    canMerge: false,
    hasApproved: false
  });
  await submit();
  expect(await expectAgreement(reviewer.client)).toMatchObject({
    canApprove: true,
    canMerge: false
  });
  await approve(reviewer.client);
  expect(await expectAgreement(reviewer.client)).toMatchObject({ hasApproved: true });
  expect(await expectAgreement(owner.client)).toMatchObject({ canMerge: true });
  // A participant who is not an organizer never sees canMerge.
  expect(await expectAgreement(reviewer.client)).toMatchObject({ canMerge: false });
});

test('blocks merging while feedback is unresolved', { timeout: 30_000 }, async () => {
  const { approve, expectAgreement, owner, proposalId, reviewer, submit } = await setup();
  await submit();
  await owner.client.mutation(api.routes.trips.versions.feedback.add.run, {
    content: 'Please double-check the dates.',
    kind: 'change_request',
    proposalId
  });
  await approve(reviewer.client);

  expect(await expectAgreement(owner.client)).toMatchObject({ canMerge: false });
});

test('needs every required approval before merging', { timeout: 30_000 }, async () => {
  const { approve, expectAgreement, owner, reviewer, secondReviewer, submit } = await setup(2);
  await submit();
  await approve(reviewer.client);
  expect(await expectAgreement(owner.client)).toMatchObject({ canMerge: false });
  await approve(secondReviewer.client);
  expect(await expectAgreement(owner.client)).toMatchObject({ canMerge: true });
});

test('offers no review actions outside review', { timeout: 30_000 }, async () => {
  const { expectAgreement, listed, owner, proposalId, reviewer } = await setup();
  for (const { client } of [owner, reviewer]) {
    expect(await expectAgreement(client)).toMatchObject({ canApprove: false, canMerge: false });
  }

  await mergeIdea(owner, reviewer, proposalId);
  expect(await listed(reviewer.client)).toMatchObject({ canApprove: false, canMerge: false });
});

test('refuses listing ideas to an outsider', async () => {
  const { owner, tripId } = await setup();
  const { client } = await createOutsiderClient(owner.test);

  await expect(client.query(api.routes.trips.versions.list.run, { tripId })).rejects.toThrow(
    'Trip not found'
  );
});
