import { mockModel } from '@convex-dev/agent';
import { chatAgentCallSettings } from '@groam/ai-contracts/provider';
import { makeFunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import { expect, test } from 'vitest';
import { AssistantSession } from '#convex/modules/assistant/agent/index';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { action, env } from '#convex-generated/server';
import { setupTrip, setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

const workspaceScreen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

// biome-ignore lint/suspicious/noExportsInTest: convex-test discovers test-only actions through module exports.
export const openForTest = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    return await AssistantSession.open(ctx);
  }
});

type MockReply =
  | 'add'
  | 'context'
  | 'create'
  | 'dates'
  | 'limits'
  | 'proposals'
  | 'screen'
  | 'status'
  | 'stay';

function toolResponse(toolName: string, toolCallId: string, input: object, text: string) {
  return mockModel({
    contentSteps: [
      [
        {
          input: JSON.stringify(input),
          toolCallId,
          toolName,
          type: 'tool-call' as const
        }
      ],
      [{ text, type: 'text' as const }]
    ]
  });
}

function languageModelForReply(
  reply: MockReply,
  destinationId: Id<'tripDestinations'>,
  tripId: Id<'trips'>,
  observeMaxOutputTokens: (value: number | undefined) => void
) {
  switch (reply) {
    case 'limits': {
      const response = mockModel({
        content: [{ text: 'The response stayed within its output budget.', type: 'text' }]
      });
      return mockModel({
        doStream: async (options) => {
          observeMaxOutputTokens(options.maxOutputTokens);
          return await response.doStream(options);
        }
      });
    }
    case 'dates':
      return toolResponse(
        'startTripVersion',
        'test-start-trip-version',
        {},
        'I started an idea for the date change.'
      );
    case 'create':
      return toolResponse(
        'createTripProposal',
        'test-create-trip-proposal',
        { currency: 'JPY', destination: 'Japan', name: 'Japan spring idea', totalDays: 10 },
        'I created the Japan spring trip idea.'
      );
    case 'screen':
      return toolResponse(
        'getScreenContext',
        'test-get-screen-context',
        {},
        'I read the current screen before answering.'
      );
    case 'context':
      return toolResponse(
        'setChatContext',
        'test-set-chat-context',
        { tags: [{ id: tripId, kind: 'trip' }] },
        'This chat is now connected to the trip.'
      );
    case 'add':
      return toolResponse(
        'addActivity',
        'test-add-activity',
        {
          day: 2,
          destinationId,
          notes: 'Deterministic test suggestion.',
          timeBlock: 'morning',
          title: 'Alfama walk'
        },
        'Done — I added the Alfama walk.'
      );
    case 'stay':
      return toolResponse(
        'addStay',
        'test-add-stay',
        {
          checkInDay: 1,
          checkOutDay: 2,
          costAmount: 240,
          destinationId,
          notes: 'Breakfast included.',
          title: 'Central Hotel'
        },
        'Done — I added Central Hotel.'
      );
    case 'status':
      return toolResponse(
        'getTripStatus',
        'test-trip-status',
        {},
        'The destination is ready, but the group still needs to review approvals.'
      );
    case 'proposals':
      return toolResponse(
        'getItinerary',
        'test-itinerary',
        {},
        'I suggest an Alfama walk or a market tasting. Which should I add?'
      );
  }
}

function isWorkspaceReply(reply: MockReply): boolean {
  return ['context', 'create', 'limits', 'screen'].includes(reply);
}

function agentForReply(_reply: MockReply) {
  return 'groam' as const;
}

// biome-ignore lint/suspicious/noExportsInTest: convex-test discovers test-only actions through module exports.
export const sendWithMockModel = action({
  args: {
    destinationId: v.id('tripDestinations'),
    prompt: v.string(),
    reply: v.union(
      v.literal('status'),
      v.literal('proposals'),
      v.literal('add'),
      v.literal('context'),
      v.literal('create'),
      v.literal('dates'),
      v.literal('limits'),
      v.literal('screen'),
      v.literal('stay')
    ),
    threadId: v.string(),
    tripId: v.id('trips')
  },
  returns: v.null(),
  handler: async (ctx, { destinationId, reply, ...target }): Promise<null> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError('Not authenticated');
    // Only the provider is deterministic: the real Agent loop still resolves,
    // executes, and persists each emitted tool call.
    let observedMaxOutputTokens: number | undefined;
    const languageModel = languageModelForReply(reply, destinationId, target.tripId, (value) => {
      observedMaxOutputTokens = value;
    });
    const section = reply === 'status' ? 'overview' : 'itinerary';
    const result = await AssistantSession.continueWithModel(
      ctx,
      {
        ...target,
        agent: agentForReply(reply),
        screen: {
          capabilities: [],
          data: JSON.stringify({ visibleSection: section }),
          description: `Test context for the ${section} screen.`,
          key: `trip:${target.tripId}:${section}`,
          target: isWorkspaceReply(reply)
            ? { kind: 'workspace' }
            : { kind: 'trip', section, tripId: target.tripId },
          title: `Test trip · ${section}`
        }
      },
      languageModel
    );
    if (reply === 'limits') {
      const expected = chatAgentCallSettings(env.OPENAI_BASE_URL).maxOutputTokens;
      if (observedMaxOutputTokens !== expected) {
        throw new Error(
          `Expected maxOutputTokens to be ${expected}, received ${observedMaxOutputTokens}`
        );
      }
    }
    return result;
  }
});

const openForTestReference = makeFunctionReference<'action', Record<string, never>, string>(
  'modules/assistant/agent/agent.test:openForTest'
);

const sendWithMockModelReference = makeFunctionReference<
  'action',
  {
    destinationId: Id<'tripDestinations'>;
    prompt: string;
    reply:
      | 'add'
      | 'context'
      | 'create'
      | 'dates'
      | 'limits'
      | 'proposals'
      | 'screen'
      | 'status'
      | 'stay';
    threadId: string;
    tripId: Id<'trips'>;
  },
  null
>('modules/assistant/agent/agent.test:sendWithMockModel');

async function setupAssistantThread() {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, name: 'Lisbon, Portugal', startDay: 1 }),
    tripId
  });
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });
  return { destinationId, owner, threadId, tripId };
}

test('caps model output so compatible providers do not request their full token window', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'Summarize this trip.',
      reply: 'limits',
      threadId,
      tripId
    })
  ).resolves.toBeNull();
});

test('builds one verified context for the current trip screen', async () => {
  const { owner, sharedTripId, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 4, name: 'Lisbon, Portugal', startDay: 2 }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: {
      ...tripActivityInput({ dayNumber: 2, timeBlock: 'morning', title: 'Museum visit' }),
      cost: { amount: 25 }
    },
    tripId
  });
  const stayId = await owner.client.mutation(api.routes.trips.destinations.stays.add.run, {
    destinationId,
    input: {
      cost: { amount: 300 },
      schedule: { checkInDay: 2, checkOutDay: 4 },
      title: 'Central Hotel'
    },
    tripId
  });

  const result = await owner.client.query(internal.modules.assistant.model.index.tripContext, {
    tripId
  });

  expect(result).toMatchObject({
    destinations: [
      {
        activities: [
          {
            cost: 25,
            day: 2,
            endDay: 2,
            id: activityId,
            timeBlock: 'morning',
            title: 'Museum visit'
          }
        ],
        endDay: 4,
        id: destinationId,
        name: 'Lisbon, Portugal',
        startDay: 2,
        stays: [
          {
            checkInDay: 2,
            checkOutDay: 4,
            cost: 300,
            id: stayId,
            title: 'Central Hotel'
          }
        ]
      }
    ],
    costTargets: expect.arrayContaining([
      expect.objectContaining({ amount: 25, id: activityId, kind: 'activity' }),
      expect.objectContaining({ amount: 300, id: stayId, kind: 'stay' })
    ]),
    totalPlannedCost: 325,
    tripName: 'Summer beach idea'
  });

  await expect(
    owner.client.mutation(internal.modules.assistant.model.index.setItineraryCost, {
      amount: 40,
      target: { id: activityId, type: 'activity' },
      tripId: sharedTripId
    })
  ).rejects.toThrow('Only a draft idea can be written to');
  await expect(
    owner.client.mutation(internal.modules.assistant.model.index.setItineraryCost, {
      amount: 40,
      target: { id: activityId, type: 'activity' },
      tripId
    })
  ).resolves.toBeNull();
  await expect(
    owner.client.query(internal.modules.assistant.model.index.tripContext, { tripId })
  ).resolves.toMatchObject({ totalPlannedCost: 340 });
});

test('adds a costed stay through the itinerary agent tool', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'Add Central Hotel to the itinerary for 240 USD.',
      reply: 'stay',
      threadId,
      tripId
    })
  ).resolves.toBeNull();

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ stays: [expect.objectContaining({ title: 'Central Hotel' })] }],
    totalPlannedCost: 240
  });
});

test('starts a protected idea before an explicitly requested agent date change', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await owner.client.action(sendWithMockModelReference, {
    destinationId,
    prompt: 'Set these dates: 2027-01-01 through 2027-01-10.',
    reply: 'dates',
    threadId,
    tripId
  });

  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    startDate: null,
    totalDurationDays: 4
  });
  const messages = await owner.client.query(api.routes.assistant.messages.run, {
    paginationOpts: { cursor: null, numItems: 20 },
    threadId
  });
  expect(messages.page).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: 'assistant',
        text: 'I started an idea for the date change.'
      })
    ])
  );
});

test('creates a new trip idea through an explicitly requested agent action', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await owner.client.action(sendWithMockModelReference, {
    destinationId,
    prompt: 'Create the Japan spring trip idea.',
    reply: 'create',
    threadId,
    tripId
  });

  const trips = await owner.client.query(api.routes.trips.list.run, {
    paginationOpts: { cursor: null, numItems: 25 }
  });
  expect(trips.page).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ destination: 'Japan', name: 'Japan spring idea' })
    ])
  );
  const createdTrip = trips.page.find((trip) => trip.name === 'Japan spring idea');
  expect(createdTrip).toBeDefined();
  await expect(owner.client.query(api.routes.assistant.chats.list.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: threadId,
        tags: [expect.objectContaining({ id: createdTrip?.id, kind: 'trip' })]
      })
    ])
  );
});

test('does not consume thread-creation quota when reopening an existing chat', async () => {
  const { owner } = await setupTrip(0);
  const threadIds: string[] = [];
  for (let attempt = 0; attempt < 5; attempt += 1) {
    threadIds.push(
      await owner.client.action(api.routes.assistant.open.run, { screen: workspaceScreen })
    );
  }
  expect(new Set(threadIds).size).toBe(1);
});

test('resumes the most recently active chat instead of the newest empty thread', async () => {
  const { destinationId, owner, threadId: activeThreadId, tripId } = await setupAssistantThread();
  await owner.client.action(api.routes.assistant.chats.create.run, { screen: workspaceScreen });

  await owner.client.action(sendWithMockModelReference, {
    destinationId,
    prompt: 'What is visible here?',
    reply: 'screen',
    threadId: activeThreadId,
    tripId
  });

  await expect(owner.client.action(openForTestReference, {})).resolves.toBe(activeThreadId);
  const chats = await owner.client.query(api.routes.assistant.chats.list.run, {});
  expect(chats[0]?.id).toBe(activeThreadId);
});

test('lets the agent request screen data through a tool instead of injecting it', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await owner.client.action(sendWithMockModelReference, {
    destinationId,
    prompt: 'What is visible here?',
    reply: 'screen',
    threadId,
    tripId
  });

  const messages = await owner.client.query(api.routes.assistant.messages.run, {
    paginationOpts: { cursor: null, numItems: 10 },
    threadId
  });
  expect(messages.page).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: 'assistant',
        text: 'I read the current screen before answering.'
      })
    ])
  );
  expect(messages.page.some((message) => message.role === 'system')).toBe(false);
});

test('lets an agent attach authoritative workspace context to a chat', async () => {
  const { destinationId, owner, threadId, tripId } = await setupAssistantThread();

  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'Attach this trip to our chat.',
      reply: 'context',
      threadId,
      tripId
    })
  ).resolves.toBeNull();

  await expect(owner.client.query(api.routes.assistant.chats.list.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: threadId,
        tags: [expect.objectContaining({ id: tripId, kind: 'trip' })]
      })
    ])
  );
});

test('uses one conversation for screen-aware reads and an explicitly confirmed write', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ endDay: 3, name: 'Lisbon, Portugal', startDay: 2 }),
    tripId
  });
  const threadId = await owner.client.action(openForTestReference, {});
  await expect(owner.client.action(openForTestReference, {})).resolves.toBe(threadId);

  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'What could we do in Lisbon?',
      reply: 'proposals',
      threadId,
      tripId
    })
  ).resolves.toBeNull();
  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'What still needs attention?',
      reply: 'status',
      threadId,
      tripId
    })
  ).resolves.toBeNull();
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ activities: [] }]
  });

  await expect(
    owner.client.action(sendWithMockModelReference, {
      destinationId,
      prompt: 'Choose the Alfama walk and add it.',
      reply: 'add',
      threadId,
      tripId
    })
  ).resolves.toBeNull();
  await expect(owner.client.query(api.routes.trips.get.run, { tripId })).resolves.toMatchObject({
    destinations: [{ activities: [expect.objectContaining({ title: 'Alfama walk' })] }]
  });
  const messages = await owner.client.query(api.routes.assistant.messages.run, {
    paginationOpts: { cursor: null, numItems: 30 },
    threadId
  });
  expect(messages.page.some((message) => message.role === 'system')).toBe(false);
  expect(messages.page).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        role: 'user',
        text: 'What could we do in Lisbon?'
      }),
      expect.objectContaining({
        agentName: 'groam',
        role: 'assistant',
        text: 'The destination is ready, but the group still needs to review approvals.'
      }),
      expect.objectContaining({
        agentName: 'groam',
        role: 'assistant',
        text: 'Done — I added the Alfama walk.'
      })
    ])
  );
});
