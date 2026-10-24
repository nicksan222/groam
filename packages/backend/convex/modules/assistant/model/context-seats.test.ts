import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { deliverCompleted, enablePayments, pay, stubStripe } from '#testing/payments';
import {
  setupTrip,
  setupWritableTrip,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';

const model = internal.modules.assistant.model.index;
const workspaceScreen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

/** A paid trip with one member who has not bought a seat yet. */
async function unpaidMemberOnPaidTrip() {
  vi.useFakeTimers();
  enablePayments();
  const stripe = stubStripe();
  const trip = await setupTrip(1);
  return { ...trip, member: trip.users[0]!, stripe };
}

test(
  'assistant context needs a seat on the trip, like the trip pages',
  { timeout: 30_000 },
  async () => {
    const { member, owner, stripe, tripId } = await unpaidMemberOnPaidTrip();

    const ownerCatalog = await owner.client.query(model.contextCatalog, {});
    expect(ownerCatalog.some((item) => item.tripId === tripId)).toBe(true);
    const memberCatalog = await member.client.query(model.contextCatalog, {});
    expect(memberCatalog.some((item) => item.tripId === tripId)).toBe(false);

    const threadId = await member.client.action(api.routes.assistant.chats.create.run, {
      screen: workspaceScreen
    });
    await expect(
      member.client.mutation(api.routes.assistant.chats.tags.run, {
        tags: [{ id: tripId, kind: 'trip' }],
        threadId
      })
    ).rejects.toThrow('Tagged trip not found');

    // Once the member pays, the same trip is theirs to tag and read.
    const { url } = await member.client.action(api.routes.trips.payments.checkout.run, { tripId });
    const session = [...stripe.sessions.values()].find((item) => item.url === url);
    if (!session) throw new Error('Expected an open Checkout session');
    pay(session);
    expect((await deliverCompleted(owner.test, session)).status).toBe(200);
    await owner.test.finishAllScheduledFunctions(vi.runAllTimers);

    expect(
      (await member.client.query(model.contextCatalog, {})).some((item) => item.tripId === tripId)
    ).toBe(true);
    await member.client.mutation(api.routes.assistant.chats.tags.run, {
      tags: [{ id: tripId, kind: 'trip' }],
      threadId
    });
    const context = await member.client.query(model.taggedContext, { threadId });
    expect(context.map((entry) => entry.kind)).toEqual(['trip']);
  }
);

test(
  'in a shared chat, tags on a trip the viewer has no seat on stay hidden and untouched',
  { timeout: 30_000 },
  async () => {
    vi.useFakeTimers();
    enablePayments();
    stubStripe();
    // An idea on a paid trip: its seat is the source trip's, which the member has not bought.
    const draft = await setupWritableTrip(1);
    const member = draft.users[0]!;
    const stopId = await draft.owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 2, name: 'Porto', placeId: 'porto', startDay: 1 }),
      tripId: draft.tripId
    });
    const activityId = await draft.owner.client.mutation(
      api.routes.trips.destinations.activities.add.run,
      {
        destinationId: stopId,
        input: tripActivityInput({ title: 'Cellar tour' }),
        tripId: draft.tripId
      }
    );
    const discussionId = await draft.owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [member.userId],
      title: 'Planning'
    });
    const threadId = await draft.owner.test.run(
      async (ctx) => (await ctx.db.get('discussions', discussionId))?.threadId ?? null
    );
    if (!threadId) throw new Error('Expected a chat thread');
    const shared = { scope: 'discussion' as const, threadId };

    await draft.owner.client.mutation(model.setContextTags, {
      ...shared,
      tags: [
        { id: draft.tripId, kind: 'trip' },
        { id: activityId, kind: 'activity' }
      ]
    });

    // The member reads none of it, and their turns are not steered by it.
    expect(await member.client.query(model.taggedContext, shared)).toEqual([]);
    expect((await member.client.query(model.access, shared)).tags).toEqual([]);
    // Re-sending a hidden tag keeps it as stored instead of failing the whole edit…
    await expect(
      member.client.mutation(model.setContextTags, {
        ...shared,
        tags: [{ id: activityId, kind: 'activity' }]
      })
    ).resolves.toHaveLength(2);
    // …but they cannot add it anywhere themselves, and it reads as missing, not as hidden.
    const privateThread = await member.client.action(api.routes.assistant.chats.create.run, {
      screen: workspaceScreen
    });
    await expect(
      member.client.mutation(api.routes.assistant.chats.tags.run, {
        tags: [{ id: activityId, kind: 'activity' }],
        threadId: privateThread
      })
    ).rejects.toThrow('Tagged activity not found');

    // Sending a prompt rewrites the thread summary around the stored tags, not the member's view.
    await member.client.mutation(model.recordPrompt, {
      ...shared,
      screenContext: '{}',
      title: 'Planning chat'
    });
    expect(
      (await draft.owner.client.query(model.taggedContext, shared)).map((e) => e.kind)
    ).toEqual(['trip', 'activity']);

    // Editing the shared tags keeps the owner's hidden ones exactly as stored.
    expect(await member.client.mutation(model.setContextTags, { ...shared, tags: [] })).toEqual([
      expect.objectContaining({ id: draft.tripId, kind: 'trip' }),
      expect.objectContaining({ id: activityId, kind: 'activity' })
    ]);
    expect(
      (await draft.owner.client.query(model.taggedContext, shared)).map((e) => e.kind)
    ).toEqual(['trip', 'activity']);
  }
);

test(
  'in a shared chat, tags whose target was deleted can be removed',
  { timeout: 30_000 },
  async () => {
    vi.useFakeTimers();
    enablePayments();
    stubStripe();
    const draft = await setupWritableTrip(1);
    const member = draft.users[0]!;
    const stopId = await draft.owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 2, name: 'Porto', placeId: 'porto', startDay: 1 }),
      tripId: draft.tripId
    });
    const activityId = await draft.owner.client.mutation(
      api.routes.trips.destinations.activities.add.run,
      {
        destinationId: stopId,
        input: tripActivityInput({ title: 'Cellar tour' }),
        tripId: draft.tripId
      }
    );
    const discussionId = await draft.owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: crypto.randomUUID(),
      memberUserIds: [member.userId],
      title: 'Planning'
    });
    const threadId = await draft.owner.test.run(
      async (ctx) => (await ctx.db.get('discussions', discussionId))?.threadId ?? null
    );
    if (!threadId) throw new Error('Expected a chat thread');
    const shared = { scope: 'discussion' as const, threadId };
    await draft.owner.client.mutation(model.setContextTags, {
      ...shared,
      tags: [
        { id: draft.tripId, kind: 'trip' },
        { id: activityId, kind: 'activity' }
      ]
    });
    await draft.owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
      activityId,
      tripId: draft.tripId
    });

    // The deleted target no longer reads as hidden: the member's edit drops it, keeps the rest.
    expect(await member.client.mutation(model.setContextTags, { ...shared, tags: [] })).toEqual([
      expect.objectContaining({ id: draft.tripId, kind: 'trip' })
    ]);
    expect(await draft.owner.client.query(model.taggedContext, shared)).toHaveLength(1);
  }
);

test('in a shared chat, hidden tags count toward the tag limit', { timeout: 30_000 }, async () => {
  vi.useFakeTimers();
  enablePayments();
  stubStripe();
  const draft = await setupWritableTrip(1);
  const member = draft.users[0]!;
  const stopId = await draft.owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 2, name: 'Porto', placeId: 'porto', startDay: 1 }),
    tripId: draft.tripId
  });
  const activityIds = [];
  for (let index = 0; index < 11; index += 1) {
    activityIds.push(
      await draft.owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
        destinationId: stopId,
        input: tripActivityInput({ title: `Stop ${index}` }),
        tripId: draft.tripId
      })
    );
  }
  const discussionId = await draft.owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Planning'
  });
  const threadId = await draft.owner.test.run(
    async (ctx) => (await ctx.db.get('discussions', discussionId))?.threadId ?? null
  );
  if (!threadId) throw new Error('Expected a chat thread');
  const shared = { scope: 'discussion' as const, threadId };
  await draft.owner.client.mutation(model.setContextTags, {
    ...shared,
    tags: [
      { id: draft.tripId, kind: 'trip' },
      ...activityIds.map((id) => ({ id, kind: 'activity' as const }))
    ]
  });

  // The member holds a free trip of their own: one more tag would make 13 with the hidden 12.
  const ownTripId = await member.client.action(api.routes.trips.create.run, {
    input: tripInput()
  });
  await expect(
    member.client.mutation(model.setContextTags, {
      ...shared,
      tags: [{ id: ownTripId, kind: 'trip' }]
    })
  ).rejects.toThrow('at most 12 context tags');
  expect(await draft.owner.client.query(model.taggedContext, shared)).toHaveLength(12);
});
