import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { setTripAttachments } from '#testing/attachments';
import { createOutsiderClient } from '#testing/factory';
import { pngBlob } from '#testing/media';
import { openTripDraft, setupTrip, tripInput } from '#testing/trips';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
function payments() {
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_media');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_media');
}
async function upload(
  client: Awaited<ReturnType<typeof setupTrip>>['owner']['client'],
  name: string
) {
  const storageId = await client.run((ctx) => ctx.storage.store(pngBlob()));
  const saved = await client.action(api.routes.media.save.run, {
    storageId,
    contentType: 'image/png',
    name
  });
  if (!saved.ok) throw new Error(saved.error);
  return { mediaId: saved.mediaId, storageId };
}
async function fixture(access = 'unpaid') {
  if (access === 'legacy') vi.stubEnv('STRIPE_SECRET_KEY', '');
  else payments();
  const trip = await setupTrip(1);
  const member = trip.users[0]!;
  const protectedFile = await upload(member.client, 'Protected passport.png');
  const ordinary = await upload(member.client, 'Ordinary upload.png');
  const draft = await openTripDraft(trip.owner, trip.tripId);
  await setTripAttachments(trip.owner.client, {
    tripId: draft.workingTripId,
    target: { type: 'trip', id: draft.workingTripId },
    mediaIds: [protectedFile.mediaId]
  });
  if (access === 'legacy') payments();
  if (access === 'disabled') vi.stubEnv('STRIPE_SECRET_KEY', '');
  if (access === 'paid') {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 'cs_media',
          url: null,
          status: 'complete',
          payment_status: 'paid',
          amount_total: 100,
          currency: 'eur',
          metadata: {}
        })
      )
    );
    await trip.owner.client.action(api.routes.trips.payments.checkout.run, {
      tripId: trip.tripId,
      userId: member.userId
    });
  }
  return { ...trip, member, protectedFile, ordinary };
}

test('unpaid media library omits protected metadata and prevents guessed-ID reuse through chat/free trip/save', async () => {
  const trip = await fixture();
  const { member, protectedFile, ordinary } = trip;
  expect(
    (await member.client.query(api.routes.media.list.run, { limit: 50 })).map((file) => file.id)
  ).toEqual([ordinary.mediaId]);
  expect(
    (await trip.owner.client.query(api.routes.media.list.run, { limit: 50 })).map((file) => file.id)
  ).toContain(protectedFile.mediaId);
  const chat = await member.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [trip.owner.userId],
    title: 'Accessible chat'
  });
  await expect(
    member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId: chat,
      text: 'Guessed attachment',
      mediaIds: [protectedFile.mediaId]
    })
  ).rejects.toThrow('Media not found');
  const freeTrip = await member.client.action(api.routes.trips.create.run, { input: tripInput() });
  const freeDraft = await openTripDraft(member, freeTrip);
  await expect(
    setTripAttachments(member.client, {
      tripId: freeDraft.workingTripId,
      target: { type: 'trip', id: freeDraft.workingTripId },
      mediaIds: [protectedFile.mediaId]
    })
  ).rejects.toThrow('attachment not found');
  expect(
    await member.client.action(api.routes.media.save.run, {
      storageId: protectedFile.storageId,
      name: 'Renamed',
      contentType: 'image/png'
    })
  ).toEqual({ ok: false, error: 'The uploaded file is not available' });
  const outsider = await createOutsiderClient(trip.owner.test);
  expect(await outsider.client.query(api.routes.media.list.run, { limit: 50 })).toEqual([]);
  await expect(
    outsider.client.mutation(api.routes.media.logo.set.run, { mediaId: protectedFile.mediaId })
  ).rejects.toThrow('Media not found');
});

test.each(['paid', 'disabled', 'legacy'])(
  '%s readers retain protected media URLs and ordinary library media',
  async (access) => {
    const { member, protectedFile, ordinary } = await fixture(access);
    const media = await member.client.query(api.routes.media.list.run, { limit: 50 });
    expect(new Set(media.map((file) => file.id))).toEqual(
      new Set([ordinary.mediaId, protectedFile.mediaId])
    );
    expect(media.find((file) => file.id === protectedFile.mediaId)?.url).toEqual(
      expect.any(String)
    );
  }
);

test('an unpaid organization manager cannot publish protected media as the group logo', async () => {
  const trip = await fixture();
  const manager = await trip.addUser('Manager', 'admin');
  await expect(
    manager.client.mutation(api.routes.media.logo.set.run, { mediaId: trip.protectedFile.mediaId })
  ).rejects.toThrow('Media not found');
  expect(
    (
      await manager.client.mutation(api.routes.media.logo.set.run, {
        mediaId: trip.ordinary.mediaId
      })
    ).url
  ).toEqual(expect.any(String));
});

test('working-copy attachments inherit the canonical source entitlement', async () => {
  const trip = await fixture();
  const draft = await openTripDraft(trip.owner, trip.tripId);
  const file = await upload(trip.owner.client, 'Draft private attachment.png');
  await setTripAttachments(trip.owner.client, {
    tripId: draft.workingTripId,
    target: { type: 'trip', id: draft.workingTripId },
    mediaIds: [file.mediaId]
  });
  expect(
    (await trip.member.client.query(api.routes.media.list.run, { limit: 50 })).map(
      (item) => item.id
    )
  ).not.toContain(file.mediaId);
  expect(
    (await trip.owner.client.query(api.routes.media.list.run, { limit: 50 })).map((item) => item.id)
  ).toContain(file.mediaId);
});

test('discussion-only trip attachments cannot bypass the library gate or be relinked to free chat', async () => {
  const trip = await fixture();
  const file = await upload(trip.owner.client, 'Protected chat document.png');
  const linked = await trip.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [trip.member.userId],
    title: 'Linked trip conversation',
    tripId: trip.tripId
  });
  await trip.owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId: linked,
    text: 'Trip document',
    mediaIds: [file.mediaId]
  });
  expect(
    (await trip.member.client.query(api.routes.media.list.run, { limit: 50 })).map(
      (item) => item.id
    )
  ).not.toContain(file.mediaId);
  const free = await trip.member.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [trip.owner.userId],
    title: 'Free conversation'
  });
  await expect(
    trip.member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId: free,
      text: 'Guessed id',
      mediaIds: [file.mediaId]
    })
  ).rejects.toThrow('Media not found');
});

test('frequently reused ordinary chat files remain available beyond the bounded origin window', async () => {
  const trip = await fixture();
  const discussionId = await trip.member.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [trip.owner.userId],
    title: 'Ordinary sharing'
  });
  let now = Date.now();
  const clock = vi.spyOn(Date, 'now');
  const postAgain = async (remaining: number): Promise<void> => {
    if (!remaining) return;
    now += 2_000;
    clock.mockReturnValue(now);
    await trip.member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: crypto.randomUUID(),
      discussionId,
      text: 'Ordinary document',
      mediaIds: [trip.ordinary.mediaId]
    });
    await postAgain(remaining - 1);
  };
  await postAgain(25);
  expect(
    (await trip.member.client.query(api.routes.media.list.run, { limit: 50 })).find(
      (file) => file.id === trip.ordinary.mediaId
    )?.url
  ).toEqual(expect.any(String));
});

test('a paid reader may deliberately publish a file to an ordinary chat for the organization', async () => {
  const trip = await fixture('paid');
  const unpaid = await trip.addUser('Unpaid reader');
  expect(
    (await unpaid.client.query(api.routes.media.list.run, { limit: 50 })).map((file) => file.id)
  ).not.toContain(trip.protectedFile.mediaId);
  const discussionId = await trip.member.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [trip.owner.userId],
    title: 'Authorized sharing'
  });
  await trip.member.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: 'Published document',
    mediaIds: [trip.protectedFile.mediaId]
  });
  expect(
    (await unpaid.client.query(api.routes.media.list.run, { limit: 50 })).find(
      (file) => file.id === trip.protectedFile.mediaId
    )?.url
  ).toEqual(expect.any(String));
});
