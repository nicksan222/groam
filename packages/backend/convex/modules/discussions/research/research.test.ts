import type { FunctionArgs } from 'convex/server';
import { expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import {
  openTripDraft,
  setupGroup,
  setupTrip,
  setupWritableTrip,
  tripActivityInput,
  tripInput,
  tripLocationInput
} from '#testing/trips';

const paginationOpts = { cursor: null, numItems: 25 };
let requestCounter = 0;
const requestId = () => `research-request-${(requestCounter += 1)}-${crypto.randomUUID()}`;

async function setupResearch() {
  const trip = await setupTrip(2);
  const discussionId = await trip.owner.client.mutation(
    api.routes.discussions.research.create.run,
    {
      brief: 'Kid friendly options',
      clientRequestId: requestId(),
      title: 'Museums in Lisbon',
      tripId: trip.tripId
    }
  );
  return { ...trip, discussionId };
}

test(
  'any trip member reads and posts without being a participant; other orgs get not found',
  { timeout: 20_000 },
  async () => {
    const { discussionId, owner, tripId, users } = await setupResearch();
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    await expect(
      member.client.query(api.routes.discussions.research.get.run, { discussionId })
    ).resolves.toMatchObject({
      canManage: false,
      kind: 'research',
      title: 'Museums in Lisbon',
      tripId
    });
    await member.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'https://example.com/museum'
    });
    const [listed] = await owner.client.query(api.routes.discussions.research.list.run, {
      kind: 'research',
      tripId
    });
    expect(listed).toMatchObject({
      brief: 'Kid friendly options',
      lastMessage: { authorName: expect.any(String), text: 'https://example.com/museum' },
      linkCount: 0,
      participantCount: 2,
      unread: true
    });

    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.query(api.routes.discussions.research.get.run, { discussionId })
    ).rejects.toThrow('Discussion not found');
    await expect(
      outsider.client.mutation(api.routes.discussions.messages.send.run, {
        clientRequestId: requestId(),
        discussionId,
        text: 'hello'
      })
    ).rejects.toThrow('Discussion not found');
  }
);

test(
  'opening a research records participation and clears unread',
  { timeout: 20_000 },
  async () => {
    const { discussionId, owner, tripId, users } = await setupResearch();
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    await owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'First finding'
    });
    const unreadFor = async () =>
      (
        await member.client.query(api.routes.discussions.research.list.run, {
          kind: 'research',
          tripId
        })
      )[0];
    expect(await unreadFor()).toMatchObject({ participantCount: 1, unread: true });
    await member.client.mutation(api.routes.discussions.mark.read.run, { discussionId });
    expect(await unreadFor()).toMatchObject({ participantCount: 2, unread: false });
  }
);

test('rejects empty and whitespace titles and overlong text', { timeout: 20_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  for (const title of ['', '   ', 'x'.repeat(121)]) {
    await expect(
      owner.client.mutation(api.routes.discussions.research.create.run, {
        clientRequestId: requestId(),
        title,
        tripId
      })
    ).rejects.toThrow('Discussion titles must contain 1 to 120 characters');
  }
  await expect(
    owner.client.mutation(api.routes.discussions.research.create.run, {
      brief: 'x'.repeat(2001),
      clientRequestId: requestId(),
      title: 'Fine',
      tripId
    })
  ).rejects.toThrow('Research briefs must be at most 2000 characters');
});

test('create is idempotent on clientRequestId', { timeout: 20_000 }, async () => {
  const { owner, tripId } = await setupTrip(0);
  const input = { clientRequestId: requestId(), title: '  Food  ', tripId };
  const first = await owner.client.mutation(api.routes.discussions.research.create.run, input);
  const second = await owner.client.mutation(api.routes.discussions.research.create.run, input);
  expect(second).toBe(first);
  await expect(
    owner.client.mutation(api.routes.discussions.research.create.run, { ...input, title: 'Other' })
  ).rejects.toThrow('Discussion request id was already used');
});

test('only the creator or a trip organizer manages a research', { timeout: 30_000 }, async () => {
  const trip = await setupTrip(1);
  const [participant] = trip.users;
  if (!participant) throw new Error('Expected a participant');
  const organizer = await trip.addUser('Admin Person', 'admin');
  const create = async (client: typeof participant.client) =>
    await client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title: 'By participant',
      tripId: trip.tripId
    });
  const discussionId = await create(participant.client);

  const other = await trip.addUser('Other Member');
  await expect(
    other.client.mutation(api.routes.discussions.rename.run, { discussionId, title: 'Hijack' })
  ).rejects.toThrow('Only the creator or a trip organizer');
  await expect(
    other.client.mutation(api.routes.discussions.research.update.run, { brief: 'x', discussionId })
  ).rejects.toThrow('Only the creator or a trip organizer');
  await expect(
    other.client.mutation(api.routes.discussions.research.remove.run, { discussionId })
  ).rejects.toThrow('Only the creator or a trip organizer');

  await participant.client.mutation(api.routes.discussions.research.update.run, {
    brief: 'Updated brief',
    discussionId,
    title: 'Renamed'
  });
  await organizer.client.mutation(api.routes.discussions.rename.run, {
    discussionId,
    title: 'Organizer rename'
  });
  await expect(
    other.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).resolves.toMatchObject({ brief: 'Updated brief', canManage: false, title: 'Organizer rename' });
  await expect(
    organizer.client.query(api.routes.discussions.research.get.run, { discussionId })
  ).resolves.toMatchObject({ canManage: true });

  await organizer.client.mutation(api.routes.discussions.research.remove.run, { discussionId });
  await expect(
    trip.owner.client.query(api.routes.discussions.research.list.run, {
      kind: 'research',
      tripId: trip.tripId
    })
  ).resolves.toEqual([]);
});

test(
  'chats list excludes researches; trip list returns only that trip',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const otherTripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ name: 'Other trip' })
    });
    await owner.client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title: 'Elsewhere',
      tripId: otherTripId
    });
    await expect(owner.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([]);
    const researches = await owner.client.query(api.routes.discussions.research.list.run, {
      kind: 'research',
      tripId
    });
    expect(researches.map((row) => row.id)).toEqual([discussionId]);
  }
);

test('group discussions still need membership', { timeout: 20_000 }, async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const bystander = await addUser('Bystander');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: requestId(),
    memberUserIds: [member.userId],
    title: 'Group chat'
  });
  await expect(
    bystander.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: 'unknown'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    bystander.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'let me in'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(owner.client.query(api.routes.discussions.list.run, {})).resolves.toHaveLength(1);
});

test('resolves a research short id with its kind and trip', { timeout: 20_000 }, async () => {
  const { discussionId, owner, tripId } = await setupResearch();
  const { shortId } = await owner.client.query(api.routes.discussions.research.get.run, {
    discussionId
  });
  await expect(
    owner.client.query(api.routes.references.resolve.run, {
      reference: shortId,
      table: 'discussions'
    })
  ).resolves.toEqual({ id: discussionId, kind: 'research', shortId, tripId });
});

test(
  'links validate trip, are idempotent, resolve labels, and reverse-lookup',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId, users } = await setupResearch();
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    const issueId = await member.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Which museums?',
      title: 'Pick museums',
      tripId
    });
    const target = { issueId, kind: 'issue' as const };
    const first = await member.client.mutation(api.routes.discussions.research.links.link.run, {
      discussionId,
      target
    });
    await expect(
      owner.client.mutation(api.routes.discussions.research.links.link.run, {
        discussionId,
        target
      })
    ).resolves.toBe(first);
    const links = await owner.client.query(api.routes.discussions.research.links.list.run, {
      discussionId
    });
    expect(links).toMatchObject([
      { kind: 'issue', label: 'Pick museums', shortId: expect.any(String) }
    ]);
    const linked = await owner.client.query(api.routes.discussions.research.links.target.run, {
      target
    });
    expect(linked.map((row) => row.id)).toEqual([discussionId]);

    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.query(api.routes.discussions.research.links.target.run, { target })
    ).resolves.toEqual([]);

    const otherTripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ name: 'Other trip' })
    });
    const foreignIssue = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Elsewhere',
      title: 'Foreign issue',
      tripId: otherTripId
    });
    await expect(
      owner.client.mutation(api.routes.discussions.research.links.link.run, {
        discussionId,
        target: { issueId: foreignIssue, kind: 'issue' }
      })
    ).rejects.toThrow('Issue not found in this trip');

    await owner.client.mutation(api.routes.discussions.research.links.unlink.run, {
      discussionId,
      target
    });
    await expect(
      owner.client.query(api.routes.discussions.research.links.list.run, { discussionId })
    ).resolves.toEqual([]);
  }
);

test('group discussions cannot be linked', { timeout: 20_000 }, async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Member');
  const tripId = await owner.client.action(api.routes.trips.create.run, { input: tripInput() });
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Body',
    title: 'Issue',
    tripId
  });
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: requestId(),
    memberUserIds: [member.userId],
    title: 'Group chat'
  });
  await expect(
    owner.client.mutation(api.routes.discussions.research.links.link.run, {
      discussionId,
      target: { issueId, kind: 'issue' }
    })
  ).rejects.toThrow('This conversation cannot be linked');
});

test('removing an activity or destination removes its links', { timeout: 30_000 }, async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, startDay: 1 }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ dayNumber: 2, timeBlock: 'afternoon' }),
    tripId
  });
  const discussionId = await owner.client.mutation(api.routes.discussions.research.create.run, {
    clientRequestId: requestId(),
    title: 'Draft research',
    tripId
  });
  const link = (args: FunctionArgs<typeof api.routes.discussions.research.links.link.run>) =>
    owner.client.mutation(api.routes.discussions.research.links.link.run, args);
  await link({
    discussionId,
    target: { kind: 'tripTarget', target: { id: activityId, type: 'activity' } }
  });
  await link({
    discussionId,
    target: { kind: 'tripTarget', target: { id: destinationId, type: 'destination' } }
  });
  const labels = async () =>
    (
      await owner.client.query(api.routes.discussions.research.links.list.run, { discussionId })
    ).map((entry) => entry.kind);
  expect((await labels()).sort()).toEqual(['activity', 'destination']);
  await owner.client.mutation(api.routes.trips.destinations.activities.remove.run, {
    activityId,
    tripId
  });
  expect(await labels()).toEqual(['destination']);
  await owner.client.mutation(api.routes.trips.destinations.remove.run, { destinationId, tripId });
  expect(await labels()).toEqual([]);
});

test(
  'deleting an organization removes researches, links, and their messages',
  { timeout: 40_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Body',
      title: 'Issue',
      tripId
    });
    await owner.client.mutation(api.routes.discussions.research.links.link.run, {
      discussionId,
      target: { issueId, kind: 'issue' }
    });
    const { messageId } = await owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'a finding'
    });
    await owner.client.mutation(api.routes.discussions.messages.react.run, {
      discussionId,
      emoji: '👍',
      messageId
    });
    const deletion = await owner.authClient.organization.delete({
      organizationId: owner.organizationId!
    });
    if (deletion.error) throw new Error(deletion.error.message ?? 'Unable to delete organization');
    const remaining = () =>
      owner.client.run(async (ctx) => ({
        discussions: (await ctx.db.query('discussions').take(1)).length,
        links: (await ctx.db.query('discussionLinks').take(1)).length,
        members: (await ctx.db.query('discussionMembers').take(1)).length,
        messages: (await ctx.db.query('discussionMessages').take(1)).length,
        reactions: (await ctx.db.query('discussionMessageReactions').take(1)).length,
        trips: (await ctx.db.query('trips').take(1)).length
      }));
    for (let attempt = 0; attempt < 200; attempt += 1) {
      await owner.client.mutation(internal.modules.organizations.cleanup.removeOrganizationData, {
        organizationId: owner.organizationId!
      });
      if (Object.values(await remaining()).every((count) => count === 0)) break;
    }
    expect(await remaining()).toEqual({
      discussions: 0,
      links: 0,
      members: 0,
      messages: 0,
      reactions: 0,
      trips: 0
    });
  }
);

test(
  'an archived trip refuses research writes but still allows reads',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
      body: 'Body',
      title: 'Issue',
      tripId
    });
    await owner.client.mutation(api.routes.trips.archive.run, { tripId });
    await expect(
      owner.client.mutation(api.routes.discussions.messages.send.run, {
        clientRequestId: requestId(),
        discussionId,
        text: 'too late'
      })
    ).rejects.toThrow('This trip is archived');
    await expect(
      owner.client.mutation(api.routes.discussions.research.links.link.run, {
        discussionId,
        target: { issueId, kind: 'issue' }
      })
    ).rejects.toThrow('This trip is archived');
    await expect(
      owner.client.mutation(api.routes.discussions.research.create.run, {
        clientRequestId: requestId(),
        title: 'New',
        tripId
      })
    ).rejects.toThrow('This trip is archived');
    await expect(
      owner.client.query(api.routes.discussions.research.get.run, { discussionId })
    ).resolves.toMatchObject({ writable: false });
    await expect(
      owner.client.query(api.routes.discussions.research.list.run, { kind: 'research', tripId })
    ).resolves.toHaveLength(1);
  }
);

test(
  'ideas link by their source trip; other trips and itinerary items are refused',
  { timeout: 40_000 },
  async () => {
    const { owner, proposalId, sharedTripId } = await setupWritableTrip(0);
    const discussionId = await owner.client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title: 'Idea research',
      tripId: sharedTripId
    });
    const link = (args: FunctionArgs<typeof api.routes.discussions.research.links.link.run>) =>
      owner.client.mutation(api.routes.discussions.research.links.link.run, args);
    await expect(
      link({ discussionId, target: { kind: 'idea', proposalId } })
    ).resolves.toBeDefined();

    const otherTripId = await owner.client.action(api.routes.trips.create.run, {
      input: tripInput({ name: 'Other trip' })
    });
    const otherDraft = await openTripDraft(owner, otherTripId);
    await expect(
      link({ discussionId, target: { kind: 'idea', proposalId: otherDraft.proposalId } })
    ).rejects.toThrow('Idea not found in this trip');

    const foreignDestination = await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 3, startDay: 1 }),
      tripId: otherDraft.workingTripId
    });
    await expect(
      link({
        discussionId,
        target: { kind: 'tripTarget', target: { id: foreignDestination, type: 'destination' } }
      })
    ).rejects.toThrow('Trip target not found');
  }
);

test(
  'a research being removed is inaccessible while the background purge finishes',
  { timeout: 60_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const organizationId = owner.organizationId!;
    await owner.test.run(async (ctx) => {
      for (let index = 0; index < 301; index += 1) {
        await ctx.db.insert('discussionMessages', {
          author: { name: 'Owner', userId: owner.userId },
          clientRequestId: `bulk-${index}`,
          content: { format: 'plain_text', text: `message ${index}` },
          discussionId,
          organizationId
        });
      }
    });
    vi.useFakeTimers();
    try {
      await owner.client.mutation(api.routes.discussions.research.remove.run, { discussionId });
      const exists = () =>
        owner.test.run(async (ctx) => (await ctx.db.get('discussions', discussionId)) !== null);
      expect(await exists()).toBe(true);
      await expect(
        owner.client.query(api.routes.discussions.research.get.run, { discussionId })
      ).rejects.toThrow('Discussion not found');
      await expect(
        owner.client.mutation(api.routes.discussions.messages.send.run, {
          clientRequestId: requestId(),
          discussionId,
          text: 'too late'
        })
      ).rejects.toThrow('Discussion not found');
      await expect(
        owner.client.query(api.routes.discussions.research.list.run, { kind: 'research', tripId })
      ).resolves.toEqual([]);
      await owner.test.finishAllScheduledFunctions(vi.runAllTimers);
      expect(await exists()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  }
);

test(
  'a research thread is not reachable through the private assistant scope',
  { timeout: 20_000 },
  async () => {
    const { discussionId, owner } = await setupResearch();
    const { threadId } = await owner.client.query(api.routes.discussions.research.get.run, {
      discussionId
    });
    if (!threadId) throw new Error('Expected a thread');
    await expect(
      owner.client.mutation(internal.modules.assistant.model.index.setContextTags, {
        scope: 'private',
        tags: [],
        threadId
      })
    ).rejects.toThrow('Discussion not found');
    await expect(
      owner.client.mutation(internal.modules.assistant.model.index.setContextTags, {
        scope: 'discussion',
        tags: [],
        threadId
      })
    ).resolves.toEqual([]);
  }
);

test(
  'archived trips refuse reacting, editing, removing, and updating research',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const { messageId } = await owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'before archive'
    });
    await owner.client.mutation(api.routes.trips.archive.run, { tripId });
    const archived = 'This trip is archived';
    await expect(
      owner.client.mutation(api.routes.discussions.messages.react.run, {
        discussionId,
        emoji: '👍',
        messageId
      })
    ).rejects.toThrow(archived);
    await expect(
      owner.client.mutation(api.routes.discussions.messages.edit.run, {
        discussionId,
        messageId,
        text: 'edited'
      })
    ).rejects.toThrow(archived);
    await expect(
      owner.client.mutation(api.routes.discussions.messages.remove.run, {
        discussionId,
        messageId
      })
    ).rejects.toThrow(archived);
    await expect(
      owner.client.mutation(api.routes.discussions.research.update.run, {
        brief: 'new',
        discussionId
      })
    ).rejects.toThrow(archived);
    await expect(
      owner.client.mutation(api.routes.discussions.research.remove.run, { discussionId })
    ).rejects.toThrow(archived);
  }
);

test('other organizations cannot resolve a research short id', { timeout: 20_000 }, async () => {
  const { discussionId, owner } = await setupResearch();
  const { shortId } = await owner.client.query(api.routes.discussions.research.get.run, {
    discussionId
  });
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client.query(api.routes.references.resolve.run, {
      reference: shortId,
      table: 'discussions'
    })
  ).resolves.toBeNull();
});

test(
  'opening hundreds of researches does not break the chats list',
  { timeout: 40_000 },
  async () => {
    const { discussionId, owner, users } = await setupResearch();
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    const groupId = await owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: requestId(),
      memberUserIds: [member.userId],
      title: 'Group chat'
    });
    const organizationId = owner.organizationId!;
    await owner.test.run(async (ctx) => {
      for (let index = 0; index < 501; index += 1) {
        await ctx.db.insert('discussionMembers', {
          discussionId,
          kind: 'research',
          organizationId,
          userId: owner.userId
        });
      }
    });
    const listed = await owner.client.query(api.routes.discussions.list.run, {});
    expect(listed.map((row) => row.id)).toEqual([groupId]);
  }
);

test('researches per trip and links per research are capped', { timeout: 40_000 }, async () => {
  const { discussionId, owner, tripId } = await setupResearch();
  const organizationId = owner.organizationId!;
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    body: 'Body',
    title: 'Issue',
    tripId
  });
  await owner.test.run(async (ctx) => {
    await ctx.db.patch('discussions', discussionId, { linkCount: 50 });
    for (let index = 0; index < 99; index += 1) {
      await ctx.db.insert('discussions', {
        clientRequestId: `bulk-research-${index}`,
        createdBy: { name: 'Owner', userId: owner.userId },
        kind: 'research',
        linkCount: 0,
        organizationId,
        participantCount: 0,
        shortId: `bulkr${index}`,
        title: `Bulk ${index}`,
        tripId,
        updatedAt: Date.now()
      });
    }
  });
  await expect(
    owner.client.mutation(api.routes.discussions.research.links.link.run, {
      discussionId,
      target: { issueId, kind: 'issue' }
    })
  ).rejects.toThrow('A research can have up to 50 links');
  await expect(
    owner.client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title: 'One too many',
      tripId
    })
  ).rejects.toThrow('A trip can have up to 100 researches');
});

test(
  'listed counts follow participation, links, unlinks, and target removal',
  { timeout: 40_000 },
  async () => {
    const { owner, tripId, users } = await setupWritableTrip(1);
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    const discussionId = await owner.client.mutation(api.routes.discussions.research.create.run, {
      clientRequestId: requestId(),
      title: 'Counts',
      tripId
    });
    const counts = async () => {
      const [row] = await owner.client.query(api.routes.discussions.research.list.run, {
        kind: 'research',
        tripId
      });
      return { links: row?.linkCount, people: row?.participantCount };
    };
    expect(await counts()).toEqual({ links: 0, people: 1 });
    await member.client.mutation(api.routes.discussions.mark.read.run, { discussionId });
    await member.client.mutation(api.routes.discussions.mark.read.run, { discussionId });
    expect(await counts()).toEqual({ links: 0, people: 2 });

    const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
      input: tripLocationInput({ endDay: 3, startDay: 1 }),
      tripId
    });
    const secondId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
      destinationId,
      input: tripActivityInput({ dayNumber: 2, timeBlock: 'afternoon' }),
      tripId
    });
    const destination = {
      kind: 'tripTarget' as const,
      target: { id: destinationId, type: 'destination' as const }
    };
    const second = {
      kind: 'tripTarget' as const,
      target: { id: secondId, type: 'activity' as const }
    };
    const link = (target: typeof destination | typeof second) =>
      owner.client.mutation(api.routes.discussions.research.links.link.run, {
        discussionId,
        target
      });
    await link(destination);
    await link(destination);
    await link(second);
    expect(await counts()).toEqual({ links: 2, people: 2 });
    await owner.client.mutation(api.routes.discussions.research.links.unlink.run, {
      discussionId,
      target: second
    });
    expect(await counts()).toEqual({ links: 1, people: 2 });
    await owner.client.mutation(api.routes.trips.destinations.remove.run, {
      destinationId,
      tripId
    });
    expect(await counts()).toEqual({ links: 0, people: 2 });
  }
);
