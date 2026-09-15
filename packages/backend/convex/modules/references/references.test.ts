import { expect, test } from 'vitest';
import { insertWithShortId } from '#convex/modules/references/index';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupGroup, setupTrip } from '#testing/trips';

test('stores six-letter IDs and resolves both forms with workspace isolation', {
  timeout: 15000
}, async () => {
  const { owner, tripId } = await setupTrip(0);
  const reference = await owner.client.query(api.routes.references.resolve.run, {
    table: 'trips',
    reference: tripId
  });
  expect(reference?.shortId).toMatch(/^[a-z]{6}$/);
  if (!reference) throw new Error('Missing reference');
  expect(
    await owner.client.query(api.routes.references.resolve.run, {
      table: 'trips',
      reference: reference.shortId.toUpperCase()
    })
  ).toEqual(reference);
  expect(
    await owner.client.query(api.routes.references.resolve.run, {
      table: 'trips',
      reference: 'invalid'
    })
  ).toBeNull();
  expect(
    await owner.client.query(api.routes.references.resolve.run, {
      table: 'tripIssues',
      reference: tripId
    })
  ).toBeNull();
  const outsider = await createOutsiderClient(owner.test);
  for (const value of [tripId, reference.shortId]) {
    expect(
      await outsider.client.query(api.routes.references.resolve.run, {
        table: 'trips',
        reference: value
      })
    ).toBeNull();
  }
});

test('retries a forced collision and rejects exhaustion without inserting duplicates', {
  timeout: 15000
}, async () => {
  const { owner, tripId } = await setupTrip(0);
  const value = {
    author: { name: 'Test', userId: owner.userId },
    body: 'Test',
    organizationId: owner.organizationId!,
    status: 'open' as const,
    title: 'Test',
    tripId,
    updatedAt: Date.now()
  };
  await owner.test.run(async (ctx) => {
    await insertWithShortId(ctx, 'tripIssues', value, () => 'aaaaaa');
    let attempt = 0;
    const id = await insertWithShortId(ctx, 'tripIssues', value, () =>
      attempt++ === 0 ? 'aaaaaa' : 'bbbbbb'
    );
    expect((await ctx.db.get('tripIssues', id))?.shortId).toBe('bbbbbb');
    expect(attempt).toBe(2);
  });
  await expect(
    owner.test.run((ctx) => insertWithShortId(ctx, 'tripIssues', value, () => 'aaaaaa'))
  ).rejects.toThrow('unique reference');
  const issues = await owner.client.query(api.routes.trips.issues.list.run, { tripId });
  expect(issues.map((issue) => issue.shortId).sort()).toEqual(['aaaaaa', 'bbbbbb']);
});

test('public issue creation displays the stored short ID', { timeout: 15000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId,
    title: 'Plan lunch',
    body: 'Choose a cafe'
  });
  const issue = await owner.client.query(api.routes.trips.issues.get.run, { issueId });
  expect(issue?.shortId).toMatch(/^[a-z]{6}$/);
  expect(
    await owner.client.query(api.routes.references.resolve.run, {
      table: 'tripIssues',
      reference: issue!.shortId!
    })
  ).toEqual({ id: issueId, shortId: issue?.shortId });
});

test('short chat references preserve participant access', { timeout: 15000 }, async () => {
  const { owner, addUser } = await setupGroup();
  const member = await addUser('Not invited to chat');
  const participant = await addUser('Chat participant');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'short-reference-chat',
    memberUserIds: [participant.userId],
    title: 'Private planning'
  });
  const reference = await owner.client.query(api.routes.references.resolve.run, {
    table: 'discussions',
    reference: discussionId
  });
  expect(reference?.shortId).toMatch(/^[a-z]{6}$/);
  if (!reference) throw new Error('Missing chat reference');
  for (const value of [discussionId, reference.shortId]) {
    expect(
      await member.client.query(api.routes.references.resolve.run, {
        table: 'discussions',
        reference: value
      })
    ).toBeNull();
  }
});
