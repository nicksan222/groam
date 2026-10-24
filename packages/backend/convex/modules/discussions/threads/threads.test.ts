import { mockModel } from '@convex-dev/agent';
import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { action } from '#convex-generated/server';
import { AssistantSession } from '#convex/modules/assistant/agent/index';
import { isStaleClaim } from '#convex/modules/discussions/threads/index';
import { createOutsiderClient } from '#testing/factory';
import { createTestUser } from '#testing/factory';
import { insertLegacyAudioMedia, pngBlob } from '#testing/media';
import { setupGroup, setupTrip } from '#testing/trips';

// Agent replies stream through scheduled functions, so these tests need real timers.
vi.useRealTimers();

const paginationOpts = { cursor: null, numItems: 25 };

const workspaceScreen = {
  capabilities: [],
  data: '{}',
  description: 'Home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only actions through module exports.
export const respondWithMockModel = action({
  args: {
    discussionId: v.id('discussions'),
    promptMessageId: v.string()
  },
  returns: v.null(),
  handler: async (ctx, { discussionId, promptMessageId }) => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    const claim = await ctx.runMutation(
      internal.modules.discussions.assistant.index.claimResponse,
      {
        discussionId,
        promptMessageId,
        screen: workspaceScreen
      }
    );
    if (!claim) return null;
    const responseText = await AssistantSession.continueDiscussionWithModel(
      ctx,
      {
        agent: claim.agent,
        prompt: claim.prompt,
        screen: {
          capabilities: [],
          data: JSON.stringify({ audience: 'shared' }),
          description: 'A selected-participant discussion.',
          key: `discussion:${discussionId}`,
          target: { kind: 'workspace' },
          title: 'Shared discussion'
        },
        threadId: claim.threadId
      },
      {
        languageModel: mockModel({
          content: [
            { text: 'Bring one universal adapter and one spare charging cable.', type: 'text' }
          ]
        }),
        promptMessageId,
        runId: claim.runId
      }
    );
    await ctx.runMutation(internal.modules.discussions.assistant.index.finishResponse, {
      discussionId,
      expectedUpdatedAt: claim.expectedUpdatedAt,
      promptMessageId,
      responseText,
      runId: claim.runId
    });
    return null;
  }
});

const respondWithMockModelReference = makeFunctionReference<
  'action',
  { discussionId: Id<'discussions'>; promptMessageId: string },
  null
>('modules/discussions/threads/threads.test:respondWithMockModel');

test('creates realtime participant discussions scoped to selected group members', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const unselected = await addUser('Unselected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-create-1',
    memberUserIds: [selected.userId],
    title: 'Packing coordination'
  });

  const listedDiscussions = await owner.client.query(api.routes.discussions.list.run, {});
  expect(listedDiscussions).toEqual([
    expect.objectContaining({
      id: discussionId,
      members: expect.arrayContaining([
        expect.objectContaining({ userId: owner.userId }),
        expect.objectContaining({ userId: selected.userId })
      ]),
      threadId: expect.any(String),
      title: 'Packing coordination'
    })
  ]);
  const threadId = listedDiscussions[0]?.threadId;
  if (!threadId) throw new Error('Expected the discussion to have an Agent thread');

  await expect(selected.client.query(api.routes.discussions.list.run, {})).resolves.toHaveLength(1);
  await expect(unselected.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([]);
  await expect(
    unselected.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    unselected.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'unauthorized-message',
      discussionId,
      text: 'I should not be able to send this.'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(owner.test.query(api.routes.discussions.list.run, {})).rejects.toThrow(
    'Not authenticated'
  );
  await expect(owner.test.query(api.routes.discussions.roster.run, {})).rejects.toThrow(
    'Not authenticated'
  );
  await expect(
    owner.test.query(api.routes.discussions.messages.attachments.run, { discussionId })
  ).rejects.toThrow('Not authenticated');
  await expect(
    owner.test.mutation(api.routes.discussions.messages.stop.run, {
      discussionId,
      order: 0,
      threadId
    })
  ).rejects.toThrow('Not authenticated');
  await expect(
    unselected.client.query(api.routes.discussions.messages.attachments.run, { discussionId })
  ).rejects.toThrow('Discussion not found');
  await expect(
    unselected.client.mutation(api.routes.discussions.messages.stop.run, {
      discussionId,
      order: 0,
      threadId
    })
  ).rejects.toThrow('Discussion not found');
  await expect(owner.client.query(api.routes.discussions.roster.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: 'Selected Traveler', userId: selected.userId })
    ])
  );
  expect(
    (await owner.client.query(api.routes.discussions.roster.run, {})).some(
      (member) => member.userId === owner.userId
    )
  ).toBe(false);

  const sent = await selected.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'discussion-message-1',
    discussionId,
    text: 'I will bring the adapters.'
  });
  expect(sent.assistantAgent).toBeNull();
  await expect(
    selected.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'discussion-message-1',
      discussionId,
      text: 'I will bring the adapters.'
    })
  ).resolves.toEqual(sent);
  await expect(
    owner.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts: { cursor: null, numItems: 0 },
      streamArgs: { kind: 'list' },
      threadId
    })
  ).resolves.toMatchObject({ page: [], streams: expect.anything() });
  await expect(
    owner.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId
    })
  ).resolves.toMatchObject({
    page: [
      {
        author: { name: 'Selected Traveler', userId: selected.userId },
        id: sent.messageId,
        mine: false,
        text: 'I will bring the adapters.'
      }
    ]
  });
});

test('lets a participant invite Groam into a shared Agent-backed discussion', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const unselected = await addUser('Unselected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-ai-create',
    memberUserIds: [selected.userId],
    title: 'Packing help'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');

  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'discussion-ai-message',
    discussionId,
    text: '@groam What charging gear should we bring?'
  });
  expect(sent.assistantAgent).toBe('groam');
  await expect(
    owner.client.query(api.routes.agents.runs.list.run, {
      agentId: 'groam',
      paginationOpts
    })
  ).resolves.toMatchObject({
    page: [
      expect.objectContaining({
        agentId: 'groam',
        discussionId,
        status: 'queued',
        surface: 'chat',
        threadId: discussion.threadId
      })
    ]
  });
  await expect(
    unselected.client.action(respondWithMockModelReference, {
      discussionId,
      promptMessageId: sent.messageId
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    selected.client.action(respondWithMockModelReference, {
      discussionId,
      promptMessageId: sent.messageId
    })
  ).rejects.toThrow('AI request not found');

  await owner.client.action(respondWithMockModelReference, {
    discussionId,
    promptMessageId: sent.messageId
  });

  const messages = await selected.client.query(api.routes.discussions.messages.list.run, {
    discussionId,
    paginationOpts,
    threadId: discussion.threadId
  });
  expect(messages.page).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        author: { name: 'Groam', userId: 'groam-ai' },
        role: 'assistant',
        text: 'Bring one universal adapter and one spare charging cable.'
      }),
      expect.objectContaining({
        author: expect.objectContaining({ userId: owner.userId }),
        role: 'user',
        text: '@groam What charging gear should we bring?'
      })
    ])
  );
  await expect(owner.client.query(api.routes.assistant.chats.list.run, {})).resolves.toEqual([]);
  const groamRuns = await owner.client.query(api.routes.agents.runs.list.run, {
    agentId: 'groam',
    paginationOpts
  });
  expect(groamRuns.page).toEqual([
    expect.objectContaining({
      discussionId,
      report: 'Bring one universal adapter and one spare charging cable.',
      status: 'complete',
      surface: 'chat'
    })
  ]);
  const groamRunId = groamRuns.page[0]?.id;
  if (!groamRunId) throw new Error('Expected a Groam run');
  await expect(
    owner.client.query(api.routes.agents.runs.events.run, {
      paginationOpts,
      runId: groamRunId
    })
  ).resolves.toEqual(
    expect.objectContaining({
      page: expect.arrayContaining([
        expect.objectContaining({ kind: 'status', label: 'Responding' }),
        expect.objectContaining({ kind: 'report', label: 'Report ready' })
      ])
    })
  );
});

test('sends discussion messages with media attachments', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-media-create',
    memberUserIds: [selected.userId],
    title: 'Photo dump'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');

  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    return await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy: owner.userId,
      name: 'rome.png',
      organizationId: owner.organizationId!,
      size: 12,
      storageId
    });
  });

  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'discussion-media-message',
    discussionId,
    mediaIds: [mediaId],
    text: ''
  });

  await expect(
    selected.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: discussion.threadId
    })
  ).resolves.toMatchObject({
    page: [
      {
        author: expect.objectContaining({ userId: owner.userId }),
        id: sent.messageId,
        media: [
          expect.objectContaining({
            contentType: 'image/png',
            id: mediaId,
            name: 'rome.png',
            url: expect.any(String)
          })
        ],
        text: 'Sent a photo'
      }
    ]
  });

  const attached = await owner.client.run(async (ctx) => {
    return (
      (await ctx.db
        .query('discussionMessageMedia')
        .withIndex('by_mediaId', (query) => query.eq('mediaId', mediaId))
        .first()) !== null
    );
  });
  expect(attached).toBe(true);

  const [listed] = await selected.client.query(api.routes.discussions.list.run, {});
  expect(listed?.lastMessage).toEqual({
    authorName: expect.any(String),
    text: 'Sent a photo'
  });
});

test('rejects discussion members outside the active organization', async () => {
  const { owner } = await setupGroup();
  await expect(
    owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: 'discussion-create-2',
      memberUserIds: ['outside-organization-user'],
      title: 'Invalid discussion'
    })
  ).rejects.toThrow('Group member not found');
});

test('refuses discussion access from another organization', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const outsider = await createOutsiderClient(owner.test);

  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-cross-org',
    memberUserIds: [selected.userId],
    title: 'Private packing'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');

  await expect(outsider.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([]);
  await expect(
    outsider.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: discussion.threadId
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    outsider.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'outsider-message',
      discussionId,
      text: 'Should fail'
    })
  ).rejects.toThrow('Discussion not found');
});

test('lets a participant rename a discussion without marking it unread', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const unselected = await addUser('Unselected Traveler');
  const outsider = await createOutsiderClient(owner.test);
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-rename-1',
    memberUserIds: [selected.userId],
    title: 'Packing coordination'
  });
  await owner.client.mutation(api.routes.discussions.mark.read.run, { discussionId });
  await selected.client.mutation(api.routes.discussions.mark.read.run, { discussionId });
  const [before] = await owner.client.query(api.routes.discussions.list.run, {});

  await selected.client.mutation(api.routes.discussions.rename.run, {
    discussionId,
    title: '  Flights and lodging  '
  });

  const [renamed] = await selected.client.query(api.routes.discussions.list.run, {});
  expect(renamed).toEqual(
    expect.objectContaining({
      id: discussionId,
      title: 'Flights and lodging',
      unread: false,
      updatedAt: before?.updatedAt
    })
  );
  await expect(owner.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([
    expect.objectContaining({ title: 'Flights and lodging', unread: false })
  ]);
  await expect(
    unselected.client.mutation(api.routes.discussions.rename.run, {
      discussionId,
      title: 'Should fail'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    outsider.client.mutation(api.routes.discussions.rename.run, {
      discussionId,
      title: 'Should fail'
    })
  ).rejects.toThrow('Discussion not found');
  await expect(
    owner.client.mutation(api.routes.discussions.rename.run, {
      discussionId,
      title: '   '
    })
  ).rejects.toThrow('Discussion titles must contain 1 to 80 characters');
});

test('removes a departing member from discussion membership', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-member-depart',
    memberUserIds: [selected.userId],
    title: 'Cleanup roster'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');
  if (!owner.organizationId) throw new Error('Expected an organization');

  await owner.client.mutation(
    internal.modules.discussions.threads.cleanup.removeOrganizationMember,
    {
      organizationId: owner.organizationId,
      userId: selected.userId
    }
  );

  await expect(selected.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([]);
  await expect(
    selected.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: discussion.threadId
    })
  ).rejects.toThrow('Discussion not found');
  await expect(owner.client.query(api.routes.discussions.list.run, {})).resolves.toEqual([
    expect.objectContaining({
      id: discussionId,
      members: [expect.objectContaining({ userId: owner.userId })]
    })
  ]);
});

test('rejects invalid discussion titles, membership, request ids, and media', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const args = {
    clientRequestId: 'discussion-replay-1',
    memberUserIds: [selected.userId],
    title: 'Packing coordination'
  };

  await expect(
    owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: 'discussion-empty-title',
      memberUserIds: [selected.userId],
      title: '   '
    })
  ).rejects.toThrow('Discussion titles must contain 1 to 80 characters');
  await expect(
    owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: 'short',
      memberUserIds: [selected.userId],
      title: 'Packing'
    })
  ).rejects.toThrow('Discussion request id must be between 8 and 100 characters');
  await expect(
    owner.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: 'discussion-solo',
      memberUserIds: [],
      title: 'Just me'
    })
  ).rejects.toThrow('Discussions must include 2 to 25 group members');

  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, args);
  await expect(owner.client.mutation(api.routes.discussions.create.run, args)).resolves.toBe(
    discussionId
  );
  await expect(
    owner.client.mutation(api.routes.discussions.create.run, { ...args, title: 'Different title' })
  ).rejects.toThrow('Discussion request id was already used');

  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');
  const [ownMediaId, foreignMediaId] = await owner.client.run(async (ctx) => {
    const createMedia = async (name: string, organizationId = owner.organizationId!) => {
      const storageId = await ctx.storage.store(pngBlob());
      return await ctx.db.insert('media', {
        contentType: 'image/png',
        createdBy: owner.userId,
        name,
        organizationId,
        size: 12,
        storageId
      });
    };
    return await Promise.all([
      createMedia('own.png'),
      createMedia('foreign.png', 'another-organization')
    ]);
  });
  if (!ownMediaId || !foreignMediaId) throw new Error('Expected test media');

  await expect(
    owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'message-empty',
      discussionId,
      text: '   '
    })
  ).rejects.toThrow('Message text must be between 1 and 5000 characters');
  await expect(
    owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'message-dup-media',
      discussionId,
      mediaIds: [ownMediaId, ownMediaId],
      text: 'Duplicates'
    })
  ).rejects.toThrow('Duplicate media attachments are not allowed');
  await expect(
    owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'message-too-many-media',
      discussionId,
      mediaIds: [ownMediaId, ownMediaId, ownMediaId, ownMediaId, ownMediaId, ownMediaId],
      text: 'Too many'
    })
  ).rejects.toThrow('Messages can include at most 5 files');
  await expect(
    owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'message-foreign-media',
      discussionId,
      mediaIds: [foreignMediaId],
      text: 'Foreign'
    })
  ).rejects.toThrow('Media not found');
  await expect(
    owner.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts: { cursor: null, numItems: 51 },
      threadId: discussion.threadId
    })
  ).rejects.toThrow('Message page size must be between 1 and 50');
});

async function setupAssistantRequest() {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-edge-create',
    memberUserIds: [selected.userId],
    title: 'Edge cases'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');
  const threadId = discussion.threadId;
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'discussion-edge-message',
    discussionId,
    text: '@groam secret plan'
  });
  const listUserMessage = async () => {
    const result = await selected.client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId
    });
    return result.page.find((message) => message.id === sent.messageId);
  };
  return { discussionId, listUserMessage, owner, selected, sent, threadId };
}

test('deleting a message removes its text, parts, and attachments for everyone', async () => {
  const { addUser, owner } = await setupGroup();
  const selected = await addUser('Selected Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'discussion-delete-create',
    memberUserIds: [selected.userId],
    title: 'Delete me'
  });
  const [discussion] = await owner.client.query(api.routes.discussions.list.run, {});
  if (!discussion?.threadId) throw new Error('Expected an Agent-backed discussion');
  const mediaId = await owner.client.run(async (ctx) => {
    const storageId = await ctx.storage.store(pngBlob());
    return await ctx.db.insert('media', {
      contentType: 'image/png',
      createdBy: owner.userId,
      name: 'secret.png',
      organizationId: owner.organizationId!,
      size: 12,
      storageId
    });
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: 'discussion-delete-message',
    discussionId,
    mediaIds: [mediaId],
    text: 'the secret hotel is the Grand Budapest'
  });
  await owner.client.mutation(api.routes.discussions.messages.remove.run, {
    discussionId,
    messageId: sent.messageId
  });

  const listed = await selected.client.query(api.routes.discussions.messages.list.run, {
    discussionId,
    paginationOpts,
    threadId: discussion.threadId
  });
  const message = listed.page.find((item) => item.id === sent.messageId);
  expect(message).toMatchObject({ attachments: [], deleted: true, media: [], parts: [] });
  expect(message?.text).toBe('This message was deleted');
  expect(JSON.stringify(listed)).not.toContain('Grand Budapest');
  await expect(
    selected.client.query(api.routes.discussions.messages.attachments.run, { discussionId })
  ).resolves.toEqual({});
  const refs = await owner.client.run((ctx) => ctx.db.query('discussionMessageMedia').collect());
  expect(refs).toEqual([]);
});

test('a failed or blank assistant reply surfaces as a failed request with a reason', async () => {
  const { discussionId, listUserMessage, owner, sent } = await setupAssistantRequest();
  const claim = await owner.client.mutation(
    internal.modules.discussions.assistant.index.claimResponse,
    { discussionId, promptMessageId: sent.messageId, screen: workspaceScreen }
  );
  if (!claim) throw new Error('Expected a claim');
  await owner.client.mutation(internal.modules.discussions.assistant.index.finishResponse, {
    discussionId,
    expectedUpdatedAt: claim.expectedUpdatedAt,
    promptMessageId: sent.messageId,
    responseText: '   ',
    runId: claim.runId
  });
  await expect(listUserMessage()).resolves.toMatchObject({
    assistantError: 'Groam returned an empty reply',
    assistantStatus: 'failed'
  });
});

test('an explicit failure keeps its reason and a rate-limited request does not stay queued', async () => {
  const { discussionId, listUserMessage, owner, sent } = await setupAssistantRequest();
  const claim = await owner.client.mutation(
    internal.modules.discussions.assistant.index.claimResponse,
    { discussionId, promptMessageId: sent.messageId, screen: workspaceScreen }
  );
  if (!claim) throw new Error('Expected a claim');
  await owner.client.mutation(internal.modules.discussions.assistant.index.finishResponse, {
    discussionId,
    error: 'Too many requests',
    expectedUpdatedAt: claim.expectedUpdatedAt,
    promptMessageId: sent.messageId,
    responseText: null,
    runId: claim.runId
  });
  await expect(listUserMessage()).resolves.toMatchObject({
    assistantError: 'Too many requests',
    assistantStatus: 'failed'
  });
  // A failed request can be retried.
  await expect(
    owner.client.mutation(internal.modules.discussions.assistant.index.claimResponse, {
      discussionId,
      promptMessageId: sent.messageId,
      screen: workspaceScreen
    })
  ).resolves.not.toBeNull();
});

test('a crashed responding claim can be reclaimed once stale', async () => {
  expect(isStaleClaim(1_000, 1_000 + 9 * 60_000)).toBe(false);
  expect(isStaleClaim(1_000, 1_000 + 10 * 60_000)).toBe(true);

  const { discussionId, owner, sent } = await setupAssistantRequest();
  const first = await owner.client.mutation(
    internal.modules.discussions.assistant.index.claimResponse,
    { discussionId, promptMessageId: sent.messageId, screen: workspaceScreen }
  );
  expect(first).not.toBeNull();
  await expect(
    owner.client.mutation(internal.modules.discussions.assistant.index.claimResponse, {
      discussionId,
      promptMessageId: sent.messageId,
      screen: workspaceScreen
    })
  ).resolves.toBeNull();
  await owner.client.run(async (ctx) => {
    const receipt = await ctx.db
      .query('discussionMessages')
      .withIndex('by_discussionId_and_agentMessageId', (query) =>
        query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
      )
      .unique();
    if (receipt) await ctx.db.patch(receipt._id, { assistantClaimedAt: Date.now() - 11 * 60_000 });
  });
  await expect(
    owner.client.mutation(internal.modules.discussions.assistant.index.claimResponse, {
      discussionId,
      promptMessageId: sent.messageId,
      screen: workspaceScreen
    })
  ).resolves.not.toBeNull();
});

test('sending a message does not mark the chat unread for the sender', async () => {
  const { owner } = await setupAssistantRequest();
  const [listed] = await owner.client.query(api.routes.discussions.list.run, {});
  expect(listed?.unread).toBe(false);
});

test('refuses to attach a discussion to another group trip', async () => {
  const { owner: groupA, tripId } = await setupTrip(1);
  const other = await createOutsiderClient(groupA.test);
  const otherMember = await createTestUser(groupA.test, {
    email: `other-member-${crypto.randomUUID()}@example.com`,
    name: 'Other Member'
  });
  const invitation = await other.client.mutation(api.routes.organizations.invitations.create.run, {
    role: 'member'
  });
  await otherMember.client.mutation(api.routes.organizations.invitations.redeem.run, {
    code: invitation.code
  });
  await expect(
    other.client.mutation(api.routes.discussions.create.run, {
      clientRequestId: 'discussion-trip-leak',
      memberUserIds: [otherMember.userId],
      title: 'Leaky',
      tripId
    })
  ).rejects.toThrow('Trip not found');
});

test('rejects sending legacy audio media in a new discussion message', async () => {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Traveler');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: 'legacy-audio-discussion',
    memberUserIds: [member.userId],
    title: 'Trip plans'
  });
  const { mediaId } = await insertLegacyAudioMedia(owner);
  await expect(
    owner.client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: 'legacy-audio-message',
      discussionId,
      mediaIds: [mediaId],
      text: ''
    })
  ).rejects.toThrow('Upload a supported image, video, or PDF');
});
