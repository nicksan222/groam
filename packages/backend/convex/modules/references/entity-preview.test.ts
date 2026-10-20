import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

test('standalone issue and idea references expose only preview routing metadata to unpaid members', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_entity_preview');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_entity_preview');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const idea = await owner.client.mutation(api.routes.trips.versions.create.run, {
    tripId,
    title: 'Hidden idea title'
  });
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId,
    title: 'Hidden issue title',
    body: 'Hidden issue body'
  });
  const outsider = await createOutsiderClient(owner.test);
  for (const [table, id] of [
    ['tripProposals', idea.proposalId],
    ['tripIssues', issueId]
  ] as const) {
    const reference = await owner.client.query(api.routes.references.resolve.run, {
      table,
      reference: id
    });
    expect(reference).toEqual({ id, shortId: expect.any(String), tripId });
    for (const value of [id, reference!.shortId]) {
      expect(
        await member.client.query(api.routes.references.resolve.run, { table, reference: value })
      ).toEqual(reference);
      expect(
        await outsider.client.query(api.routes.references.resolve.run, { table, reference: value })
      ).toBeNull();
    }
    expect(
      await member.client.query(api.routes.references.resolve.run, { table, reference: 'invalid' })
    ).toBeNull();
  }
  await expect(
    member.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).rejects.toThrow('Trip not found');
  await expect(member.client.query(api.routes.trips.issues.get.run, { issueId })).rejects.toThrow(
    'Trip not found'
  );
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  expect(
    await member.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).toMatchObject({ title: 'Hidden idea title' });
  expect(await member.client.query(api.routes.trips.issues.get.run, { issueId })).toMatchObject({
    title: 'Hidden issue title'
  });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_entity_preview');
  const seat = (await owner.client.mutation(internal.modules.payments.storage.prepare, {
    tripId,
    userId: member.userId
  }))!;
  await owner.client.mutation(internal.modules.payments.storage.complete, {
    id: seat.id,
    attempt: seat.attempt,
    sessionId: 'cs_preview_paid'
  });
  expect(
    await member.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).toMatchObject({ title: 'Hidden idea title' });
  expect(await member.client.query(api.routes.trips.issues.get.run, { issueId })).toMatchObject({
    title: 'Hidden issue title'
  });
});

test('legacy trip entity references and content remain available with Stripe configured later', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  const { owner, tripId, users } = await setupTrip(1);
  const member = users[0]!;
  const idea = await owner.client.mutation(api.routes.trips.versions.create.run, { tripId });
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_entity_preview');
  expect(
    await member.client.query(api.routes.references.resolve.run, {
      table: 'tripProposals',
      reference: idea.proposalId
    })
  ).toMatchObject({ tripId });
  expect(
    await member.client.query(api.routes.trips.versions.get.run, { proposalId: idea.proposalId })
  ).toMatchObject({ id: idea.proposalId });
});

test('trip-linked group chat preview metadata requires actual chat membership and protects messages', async () => {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_entity_preview');
  const { owner, tripId, users } = await setupTrip(2);
  const member = users[0]!;
  const nonmember = users[1]!;
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    tripId,
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Hidden chat title'
  });
  const reference = await owner.client.query(api.routes.references.resolve.run, {
    table: 'discussions',
    reference: discussionId
  });
  expect(reference).toEqual({
    id: discussionId,
    shortId: expect.any(String),
    kind: 'group',
    tripId
  });
  const outsider = await createOutsiderClient(owner.test);
  for (const value of [discussionId, reference!.shortId]) {
    expect(
      await member.client.query(api.routes.references.resolve.run, {
        table: 'discussions',
        reference: value
      })
    ).toEqual(reference);
    expect(
      await nonmember.client.query(api.routes.references.resolve.run, {
        table: 'discussions',
        reference: value
      })
    ).toBeNull();
    expect(
      await outsider.client.query(api.routes.references.resolve.run, {
        table: 'discussions',
        reference: value
      })
    ).toBeNull();
  }
  const discussion = (await owner.client.query(api.routes.discussions.list.run, {})).find(
    (item) => item.id === discussionId
  )!;
  if (!discussion.threadId) throw new Error('Expected thread');
  await expect(
    member.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      threadId: discussion.threadId,
      paginationOpts: { cursor: null, numItems: 10 },
      streamArgs: { kind: 'list' }
    })
  ).rejects.toThrow('Discussion not found');
});
