import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import type { ListedMedia } from '#convex/modules/media/library/validators';
import { setTripAttachments } from '#testing/attachments';
import { createOutsiderClient } from '#testing/factory';
import {
  deletePendingMedia,
  pngBlob,
  seedDenseMediaOrigins,
  setMediaOriginSeatPaid
} from '#testing/media';
import { confirmFixtureSeats, inviteFixtureTravelers, setupBillableTrip } from '#testing/payments';
import { openTripDraft, tripInput } from '#testing/trips';

afterEach(() => vi.unstubAllEnvs());

async function fixture() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_origins');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_origins');
  const group = await setupBillableTrip(1);
  const draft = await openTripDraft(group.owner, group.tripId);
  const files = await seedDenseMediaOrigins(group.owner, draft.workingTripId, 1);
  const mediaId = files[0];
  if (!mediaId) throw new Error('Expected dense historical media');
  return { ...group, member: group.users[0]!, mediaId };
}

type Client = Awaited<ReturnType<typeof fixture>>['member']['client'];
async function discover(client: Client, mediaId?: Id<'media'>) {
  const items: ListedMedia[] = [];
  let cursor: string | null = null;
  for (let step = 0; step < 12; step += 1) {
    // oxlint-disable-next-line react-doctor/async-await-in-loop -- Manual continuation is bounded in this regression, with the real query's transaction limit enforced every call.
    const page = await client.run(async (ctx) => {
      const result = await ctx.runQuery(
        api.routes.media.discover.run,
        { cursor, mediaId },
        {
          transactionLimits: { databaseQueries: 4096 }
        }
      );
      return { result, metrics: await ctx.meta.getTransactionMetrics() };
    });
    expect(page.metrics.databaseQueries.used).toBeLessThan(4096);
    items.push(...page.result.items);
    if (page.result.done) return items;
    expect(page.result.cursor).toEqual(expect.any(String));
    cursor = page.result.cursor;
  }
  throw new Error('Discovery failed to exhaust its bounded fixture');
}

async function ordinaryChat(group: Awaited<ReturnType<typeof fixture>>) {
  return group.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [group.member.userId],
    title: 'Ordinary sharing'
  });
}

test('a later ordinary-chat origin renders legacy media and yields a reusable bounded proof', async () => {
  const group = await fixture();
  const discussionId = await ordinaryChat(group);
  await group.owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: 'Later publication',
    mediaIds: [group.mediaId]
  });
  const direct = await group.member.client.query(api.routes.discussions.messages.attachments.run, {
    discussionId
  });
  expect(Object.values(direct).flat()).toEqual([
    expect.objectContaining({ id: group.mediaId, url: expect.any(String) })
  ]);
  await expect(
    group.member.client.query(api.routes.media.page.run, {
      paginationOpts: { numItems: 20, cursor: null }
    })
  ).rejects.toThrow('MEDIA_ACCESS_UNRESOLVED');
  const found = await discover(group.member.client, group.mediaId);
  const file = found[0];
  if (!file?.accessOrigin) throw new Error('Expected an actual origin proof');
  expect(file.id).toBe(group.mediaId);
  expect(file.accessOrigin.kind).toBe('message');
  await expect(
    group.member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId,
      text: 'Without discovery',
      mediaIds: [file.id]
    })
  ).rejects.toThrow('MEDIA_ACCESS_UNRESOLVED');
  await group.member.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: 'Validated reuse',
    mediaIds: [file.id],
    mediaOrigins: [{ mediaId: file.id, origin: file.accessOrigin }]
  });
  const storageId = await group.owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const ordinary = await group.owner.client.action(api.routes.media.save.run, {
    storageId,
    contentType: 'image/png',
    name: 'Latest ordinary upload'
  });
  if (!ordinary.ok) throw new Error(ordinary.error);
  expect((await discover(group.member.client)).map(({ id }) => id)).toEqual([
    ordinary.mediaId,
    group.mediaId
  ]);
  const outsideChat = await group.addUser('Outside the ordinary chat');
  expect((await discover(outsideChat.client, group.mediaId)).map(({ id }) => id)).toEqual([
    group.mediaId
  ]);
  const outsider = await createOutsiderClient(group.owner.test);
  expect(
    await outsider.client.query(api.routes.media.discover.run, { mediaId: group.mediaId })
  ).toEqual({ items: [], cursor: null, done: true });
});

test('a later paid trip pin renders directly, resolves through cursors, and cannot survive entitlement revocation', async () => {
  const group = await fixture();
  const tripId = await group.owner.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await inviteFixtureTravelers(group.owner, tripId);
  await confirmFixtureSeats(group.owner, tripId, [group.member.userId]);
  const draft = await openTripDraft(group.owner, tripId);
  await setTripAttachments(group.owner.client, {
    tripId: draft.workingTripId,
    target: { type: 'trip', id: draft.workingTripId },
    mediaIds: [group.mediaId]
  });
  const direct = await group.member.client.query(api.routes.trips.attachments.list.run, {
    tripId: draft.workingTripId,
    target: { type: 'trip', id: draft.workingTripId }
  });
  expect(direct).toEqual([
    expect.objectContaining({ mediaId: group.mediaId, url: expect.any(String) })
  ]);
  const resolved = (await discover(group.member.client, group.mediaId))[0];
  if (!resolved?.accessOrigin) throw new Error('Expected a later trip proof');
  expect(resolved.accessOrigin.kind).toBe('attachment');
  const storageId = await group.owner.client.run((ctx) => ctx.storage.store(pngBlob()));
  const other = await group.owner.client.action(api.routes.media.save.run, {
    storageId,
    contentType: 'image/png',
    name: 'Other upload'
  });
  if (!other.ok) throw new Error(other.error);
  await expect(
    group.member.client.mutation(api.routes.media.logo.set.run, {
      mediaId: other.mediaId,
      accessOrigin: resolved.accessOrigin
    })
  ).rejects.toThrow('Media not found');
  await setMediaOriginSeatPaid(group.owner, { tripId, userId: group.member.userId, paid: false });
  await expect(
    group.member.client.mutation(api.routes.media.logo.set.run, {
      mediaId: group.mediaId,
      accessOrigin: resolved.accessOrigin
    })
  ).rejects.toThrow('Media not found');
  expect(await discover(group.member.client, group.mediaId)).toEqual([]);
});

test('cursor phases, scopes and pending file deletion never establish a grant', async () => {
  const group = await fixture();
  // Add a twenty-first protected origin so the fast path correctly reports unresolved.
  const chat = await group.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [group.member.userId],
    title: 'Protected later origin',
    tripId: group.tripId
  });
  await group.owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId: chat,
    text: 'Still protected',
    mediaIds: [group.mediaId]
  });
  const pending = await group.member.client.query(api.routes.media.discover.run, {});
  expect(pending.items).toEqual([]);
  expect(pending.done).toBe(false);
  if (!pending.cursor) throw new Error('Expected pending cursor');
  const prefix = 'media-discovery-v1:';
  const state = JSON.parse(pending.cursor.slice(prefix.length));
  const forged =
    prefix +
    JSON.stringify({ ...state, phase: 'messages', doneAfterMedia: true, originCursor: null });
  const forgedResult = await group.member.client.query(api.routes.media.discover.run, {
    cursor: forged
  });
  expect(forgedResult.items).toEqual([]);
  await expect(
    group.owner.client.query(api.routes.media.discover.run, { cursor: pending.cursor })
  ).rejects.toThrow('Invalid media discovery cursor');
  await expect(
    group.member.client.query(api.routes.media.discover.run, { cursor: 'x'.repeat(8193) })
  ).rejects.toThrow('Invalid media discovery cursor');
  await expect(
    group.member.client.query(api.routes.media.discover.run, {
      cursor: prefix + JSON.stringify({ ...state, phase: 'unattached' })
    })
  ).rejects.toThrow('Invalid media discovery cursor');
  const outsider = await createOutsiderClient(group.owner.test);
  const storageId = await outsider.client.run((ctx) => ctx.storage.store(pngBlob()));
  const foreign = await outsider.client.action(api.routes.media.save.run, {
    storageId,
    contentType: 'image/png',
    name: 'Foreign content'
  });
  if (!foreign.ok) throw new Error(foreign.error);
  const crossFile = prefix + JSON.stringify({ ...state, mediaId: foreign.mediaId });
  expect(
    (await group.member.client.query(api.routes.media.discover.run, { cursor: crossFile })).items
  ).toEqual([]);
  const wrongScope = prefix + JSON.stringify({ ...state, organizationId: 'wrong-group' });
  await expect(
    group.member.client.query(api.routes.media.discover.run, { cursor: wrongScope })
  ).rejects.toThrow('Invalid media discovery cursor');
  const badId = prefix + JSON.stringify({ ...state, mediaId: 'not-a-media-id' });
  await expect(
    group.member.client.query(api.routes.media.discover.run, { cursor: badId })
  ).rejects.toThrow('Invalid media discovery cursor');
  await confirmFixtureSeats(group.owner, group.tripId, [group.member.userId]);
  const granted = await group.member.client.query(api.routes.media.discover.run, {
    cursor: pending.cursor
  });
  expect(granted.items).toEqual([
    expect.objectContaining({ id: group.mediaId, url: expect.any(String) })
  ]);
  await setMediaOriginSeatPaid(group.owner, {
    tripId: group.tripId,
    userId: group.member.userId,
    paid: false
  });
  await deletePendingMedia(group.owner, group.mediaId);
  const deleted = await group.member.client.query(api.routes.media.discover.run, {
    cursor: pending.cursor
  });
  expect(deleted.items).toEqual([]);
  if (!deleted.done) {
    expect(
      await group.member.client.query(api.routes.media.discover.run, { cursor: deleted.cursor })
    ).toEqual({ items: [], cursor: null, done: true });
  }
});

test('merge and clone preserve later accessible origins through exact internal pin proofs', async () => {
  const group = await fixture();
  const tripId = await group.member.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await inviteFixtureTravelers(group.owner, tripId);
  await confirmFixtureSeats(group.owner, tripId, [group.owner.userId]);
  const draft = await openTripDraft(group.owner, tripId);
  await setTripAttachments(group.owner.client, {
    tripId: draft.workingTripId,
    target: { type: 'trip', id: draft.workingTripId },
    mediaIds: [group.mediaId]
  });
  // The future merge actor's valid origin is beyond the generic fast scan.
  await expect(group.member.client.query(api.routes.media.list.run, { limit: 20 })).rejects.toThrow(
    'MEDIA_ACCESS_UNRESOLVED'
  );
  await group.owner.client.action(api.routes.trips.versions.submit.run, {
    proposalId: draft.proposalId
  });
  await group.member.client.mutation(api.routes.trips.versions.approval.run, {
    proposalId: draft.proposalId,
    approved: true
  });
  await group.member.client.action(api.routes.trips.versions.merge.run, {
    proposalId: draft.proposalId
  });
  const cloned = await openTripDraft(group.member, tripId);
  const attachments = await group.member.client.query(api.routes.trips.attachments.list.run, {
    tripId: cloned.workingTripId,
    target: { type: 'trip', id: cloned.workingTripId }
  });
  expect(attachments).toEqual([
    expect.objectContaining({ mediaId: group.mediaId, url: expect.any(String) })
  ]);
});
