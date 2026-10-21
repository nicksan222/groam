import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { confirmFixtureSeats, inviteFixtureTravelers } from '#testing/payments';
import { setupTrip, paginationArgs, tripInput } from '#testing/trips';

import { changedTripDetails } from '#testing/versions';

afterEach(() => vi.unstubAllEnvs());

function enablePayments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_idea_access');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_idea_access');
}

async function setupIdeas() {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const fixture = await setupTrip(2);
  await confirmFixtureSeats(
    fixture.owner,
    fixture.tripId,
    fixture.users.map((user) => user.userId)
  );
  const accessible = await fixture.owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId: fixture.tripId,
    title: 'Paid idea'
  });
  enablePayments();
  const paidTripId = await fixture.owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: 'Paid source name' })
  });
  await inviteFixtureTravelers(fixture.owner, paidTripId);
  const privateIdea = await fixture.owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId: paidTripId,
    title: 'Private paid idea'
  });
  const member = fixture.users[0]!;
  // A draft made while billing was skipped still inherits its source entitlement later.
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const formerDraft = await member.client.mutation(api.routes.trips.versions.create.run, {
    tripId: paidTripId,
    title: 'Formerly accessible draft'
  });
  enablePayments();
  return { ...fixture, formerDraft, accessible, member, paidTripId, privateIdea };
}

async function payFor(fixture: Awaited<ReturnType<typeof setupIdeas>>, userId: string) {
  const seat = await fixture.owner.client.mutation(internal.modules.payments.storage.prepare, {
    tripId: fixture.paidTripId,
    userId
  });
  if (!seat) throw new Error('Expected a payment seat');
  await fixture.owner.client.mutation(internal.modules.payments.storage.complete, {
    id: seat.id,
    attempt: seat.attempt,
    sessionId: `cs_idea_${userId}`
  });
}

test('workspace and personal idea lists filter unpaid sources while preserving accessible, creator, paid, and no-key access', async () => {
  const fixture = await setupIdeas();
  const { member, owner, accessible, privateIdea, formerDraft } = fixture;
  const list = () =>
    member.client.query(api.routes.trips.versions.workspace.list.run, paginationArgs);
  const pending = () => member.client.query(api.routes.trips.versions.workspace.pending.run, {});
  expect((await list()).page.map((idea) => idea.id)).toEqual([accessible.proposalId]);
  expect(await pending()).toEqual([]);
  expect(
    (
      await owner.client.query(api.routes.trips.versions.workspace.list.run, paginationArgs)
    ).page.map((idea) => idea.id)
  ).toContain(privateIdea.proposalId);

  const first = await member.client.query(api.routes.trips.versions.workspace.list.run, {
    paginationOpts: { cursor: null, numItems: 1 }
  });
  expect(first.page).toEqual([]);
  expect(first.isDone).toBe(false);
  const second = await member.client.query(api.routes.trips.versions.workspace.list.run, {
    paginationOpts: { cursor: first.continueCursor, numItems: 1 }
  });
  expect(second.page).toEqual([]);
  const third = await member.client.query(api.routes.trips.versions.workspace.list.run, {
    paginationOpts: { cursor: second.continueCursor, numItems: 1 }
  });
  expect(third.page.map((idea) => idea.id)).toEqual([accessible.proposalId]);

  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect((await list()).page).toHaveLength(3);
  expect((await pending()).map((idea) => idea.id)).toContain(formerDraft.proposalId);
  enablePayments();
  await payFor(fixture, member.userId);
  expect((await list()).page).toHaveLength(3);
  expect((await pending()).map((idea) => idea.id)).toContain(formerDraft.proposalId);
});

test(
  'idea notifications exclude unpaid recipients for default and explicit audiences, keeping entitled notifications',
  { timeout: 15_000 },
  async () => {
    const fixture = await setupIdeas();
    const { owner, member, users, formerDraft, privateIdea, accessible } = fixture;
    const paidReviewer = users[1]!;
    await payFor(fixture, paidReviewer.userId);
    await owner.client.mutation(api.routes.trips.versions.close.run, {
      proposalId: formerDraft.proposalId,
      reason: 'Private decision'
    });
    expect(await member.client.query(api.routes.notifications.list.run, {})).toEqual([]);
    await owner.client.mutation(api.routes.trips.update.run, {
      tripId: privateIdea.workingTripId,
      input: changedTripDetails
    });
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: privateIdea.proposalId
    });
    expect(await member.client.query(api.routes.notifications.list.run, {})).toEqual([]);
    expect(await paidReviewer.client.query(api.routes.notifications.list.run, {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'idea_shared',
          body: expect.stringContaining('Private paid idea')
        })
      ])
    );

    const detail = () =>
      owner.client.query(api.routes.trips.versions.get.run, { proposalId: privateIdea.proposalId });
    expect((await detail()).availableReviewers.map((reviewer) => reviewer.userId)).not.toContain(
      member.userId
    );
    expect((await detail()).reviewers.some((reviewer) => reviewer.kind === 'agent')).toBe(true);
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    await member.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: privateIdea.proposalId
    });
    expect((await detail()).approvalCount).toBe(1);
    enablePayments();
    expect((await detail()).approvalCount).toBe(0);
    await paidReviewer.client.mutation(api.routes.trips.versions.approval.run, {
      approved: true,
      proposalId: privateIdea.proposalId
    });
    expect((await detail()).approvalCount).toBe(1);

    // Paid trips remain shared with the roster even while payments are enabled.
    await owner.client.mutation(api.routes.trips.update.run, {
      tripId: accessible.workingTripId,
      input: changedTripDetails
    });
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: accessible.proposalId
    });
    expect(await member.client.query(api.routes.notifications.list.run, {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: expect.stringContaining('Paid idea') })
      ])
    );

    vi.stubEnv('STRIPE_SECRET_KEY', '');
    const bypass = await owner.client.mutation(api.routes.trips.versions.create.run, {
      tripId: fixture.paidTripId,
      title: 'Billing skipped idea'
    });
    await owner.client.mutation(api.routes.trips.update.run, {
      tripId: bypass.workingTripId,
      input: changedTripDetails
    });
    await owner.client.action(api.routes.trips.versions.submit.run, {
      proposalId: bypass.proposalId
    });
    expect(await member.client.query(api.routes.notifications.list.run, {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ body: expect.stringContaining('Billing skipped idea') })
      ])
    );
  }
);
