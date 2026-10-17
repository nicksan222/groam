import { mockModel } from '@convex-dev/agent';
import { assistantToolSpecs } from '@groam/ai/tools/specs';
import { type FunctionReference, makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { expect, test, vi } from 'vite-plus/test';
import {
  createCreateResearchTool,
  createLinkResearchTool,
  createListResearchesTool,
  createPostToResearchTool,
  createReadResearchTool
} from '#backend/assistant/tools/research/research';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { action } from '#convex-generated/server';
import { AssistantSession } from '#convex/modules/assistant/agent/index';
import { AssistantInstructions } from '#convex/modules/assistant/agent/instructions';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

vi.useRealTimers();

const paginationOpts = { cursor: null, numItems: 25 };
let counter = 0;
const requestId = () => `research-tools-${(counter += 1)}-${crypto.randomUUID()}`;

// oxlint-disable-next-line jest/no-export -- convex-test discovers test-only actions through module exports.
export const captureInstructions = action({
  args: { discussionId: v.id('discussions'), promptMessageId: v.string() },
  returns: v.string(),
  handler: async (ctx, { discussionId, promptMessageId }) => {
    const claim = await ctx.runMutation(
      internal.modules.discussions.assistant.index.claimResponse,
      { discussionId, promptMessageId }
    );
    if (!claim) return '';
    const model = mockModel({ content: [{ text: 'Noted.', type: 'text' }] });
    let captured = '';
    const originalStream = model.doStream.bind(model);
    model.doStream = async (options) => {
      captured = JSON.stringify(options.prompt);
      return await originalStream(options);
    };
    await AssistantSession.continueDiscussionWithModel(
      ctx,
      {
        agent: claim.agent,
        prompt: claim.prompt,
        screen: {
          capabilities: [],
          data: '{}',
          description: 'Research thread',
          key: `discussion:${discussionId}`,
          target: { kind: 'workspace' },
          title: 'Research'
        },
        threadId: claim.threadId
      },
      { languageModel: model, promptMessageId, runId: claim.runId }
    );
    return captured;
  }
});

const captureInstructionsReference = makeFunctionReference<
  'action',
  { discussionId: Id<'discussions'>; promptMessageId: string },
  string
>('modules/discussions/research/assistant.test:captureInstructions');

type Client = Awaited<ReturnType<typeof setupTrip>>['owner']['client'];
type RunnableTool = {
  ctx?: unknown;
  execute: (input: unknown, options: unknown) => Promise<unknown>;
};

/** Runs a real tool with a ctx that calls the internal functions as the signed-in user. */
async function runTool(tool: unknown, client: Client, input: unknown) {
  const runnable = tool as RunnableTool;
  runnable.ctx = {
    runMutation: (reference: FunctionReference<'mutation'>, args: Record<string, unknown>) =>
      client.mutation(reference, args),
    runQuery: (reference: FunctionReference<'query'>, args: Record<string, unknown>) =>
      client.query(reference, args)
  };
  return await runnable.execute(input, { messages: [], toolCallId: 'call-1' });
}

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

test('specs name the research tools for the right agents', () => {
  expect(assistantToolSpecs['research.list'].agents).toEqual(['groam', 'researcher']);
  expect(assistantToolSpecs['research.read'].agents).toEqual(['groam', 'researcher']);
  expect(assistantToolSpecs['research.create'].agents).toEqual(['groam']);
  expect(assistantToolSpecs['research.post'].agents).toEqual(['groam']);
  expect(assistantToolSpecs['research.link'].agents).toEqual(['groam', 'researcher']);
});

test(
  'create, list, read, and link run as the user; other orgs are refused',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const { client } = owner;
    await expect(
      runTool(createCreateResearchTool(tripId), client, { title: 'Food', brief: 'Pastries' })
    ).resolves.toMatchObject({ researchId: expect.any(String) });

    const listed = (await runTool(createListResearchesTool(tripId), client, {})) as {
      researches: Array<{ id: string; title: string }>;
    };
    expect(listed.researches.map((research) => research.title).sort()).toEqual([
      'Food',
      'Museums in Lisbon'
    ]);

    const issueId = await client.mutation(api.routes.trips.issues.create.run, {
      body: 'Body',
      title: 'Book tickets',
      tripId
    });
    await expect(
      runTool(createLinkResearchTool(), client, {
        action: 'link',
        researchId: discussionId,
        targetId: issueId,
        targetType: 'issue'
      })
    ).resolves.toMatchObject({ status: 'done' });
    await client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: 'Look at the Gulbenkian'
    });
    const read = await runTool(createReadResearchTool(), client, { researchId: discussionId });
    expect(read).toMatchObject({
      research: {
        brief: 'Kid friendly options',
        links: [{ kind: 'issue', label: 'Book tickets', targetId: issueId }],
        messages: [{ author: expect.any(String), text: 'Look at the Gulbenkian' }],
        title: 'Museums in Lisbon'
      }
    });
    await runTool(createLinkResearchTool(), client, {
      action: 'unlink',
      researchId: discussionId,
      targetId: issueId,
      targetType: 'issue'
    });
    await expect(
      client.query(api.routes.discussions.research.links.list.run, { discussionId })
    ).resolves.toEqual([]);

    const outsider = await createOutsiderClient(owner.test);
    await expect(
      runTool(createReadResearchTool(), outsider.client, { researchId: discussionId })
    ).rejects.toThrow('Discussion not found');
    await expect(runTool(createListResearchesTool(tripId), outsider.client, {})).rejects.toThrow();
    await expect(
      runTool(createPostToResearchTool('groam'), outsider.client, {
        researchId: discussionId,
        text: 'hi'
      })
    ).rejects.toThrow('Discussion not found');
    await expect(
      runTool(createLinkResearchTool(), outsider.client, {
        action: 'link',
        researchId: discussionId,
        targetId: issueId,
        targetType: 'issue'
      })
    ).rejects.toThrow('Discussion not found');
    await expect(
      runTool(createCreateResearchTool(tripId), outsider.client, { title: 'Nope' })
    ).rejects.toThrow();
  }
);

test(
  'research.post saves an agent message that lists like a reply and bumps the research',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const { client } = owner;
    await expect(
      runTool(createPostToResearchTool('groam'), client, {
        researchId: discussionId,
        text: 'Top pick: the Gulbenkian museum.'
      })
    ).resolves.toMatchObject({ messageId: expect.any(String), status: 'posted' });

    const [research] = await client.query(api.routes.discussions.research.list.run, {
      kind: 'research',
      tripId
    });
    expect(research).toMatchObject({
      lastMessage: { authorName: 'Groam', text: 'Top pick: the Gulbenkian museum.' }
    });
    const detail = await client.query(api.routes.discussions.research.get.run, { discussionId });
    if (!detail.threadId) throw new Error('Expected a thread');
    const messages = await client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: detail.threadId
    });
    expect(messages.page).toEqual([
      expect.objectContaining({
        agentName: 'groam',
        author: expect.objectContaining({ userId: 'groam-ai' }),
        role: 'assistant',
        text: 'Top pick: the Gulbenkian museum.'
      })
    ]);
  }
);

test(
  'research.post refuses group discussions and archived trips',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId, users } = await setupResearch();
    const { client } = owner;
    const [member] = users;
    if (!member) throw new Error('Expected a member');
    const groupId = await client.mutation(api.routes.discussions.create.run, {
      clientRequestId: requestId(),
      memberUserIds: [member.userId],
      title: 'Packing chat'
    });
    await expect(
      runTool(createPostToResearchTool('groam'), client, { researchId: groupId, text: 'hi' })
    ).rejects.toThrow('Only a research can be posted to');
    await client.mutation(api.routes.trips.archive.run, { tripId });
    await expect(
      runTool(createPostToResearchTool('groam'), client, { researchId: discussionId, text: 'hi' })
    ).rejects.toThrow('This trip is archived');
  }
);

test(
  'instructions carry the research context for research discussions only',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner } = await setupResearch();
    const { client } = owner;
    const detail = await client.query(api.routes.discussions.research.get.run, { discussionId });
    if (!detail.threadId) throw new Error('Expected a thread');
    const context = await client.query(
      internal.modules.discussions.research.tools.instructionContext,
      { threadId: detail.threadId }
    );
    expect(context).toEqual({
      brief: 'Kid friendly options',
      links: [],
      title: 'Museums in Lisbon'
    });
    expect(
      AssistantInstructions.for('researcher', 'discussion', [], context ?? undefined)
    ).toContain('Museums in Lisbon');

    const sent = await client.mutation(api.routes.discussions.messages.send.run, {
      clientRequestId: requestId(),
      discussionId,
      text: '@researcher find museums'
    });
    const prompt = await client.action(captureInstructionsReference, {
      discussionId,
      promptMessageId: sent.messageId
    });
    expect(prompt).toContain('Museums in Lisbon');
    expect(prompt).toContain('Kid friendly options');
  }
);

test(
  'a researcher message shows the Researcher label in the thread and the preview',
  { timeout: 30_000 },
  async () => {
    const { discussionId, owner, tripId } = await setupResearch();
    const { client } = owner;
    await runTool(createPostToResearchTool('researcher'), client, {
      researchId: discussionId,
      text: 'Found three museums.'
    });
    const [research] = await client.query(api.routes.discussions.research.list.run, {
      kind: 'research',
      tripId
    });
    expect(research?.lastMessage).toEqual({
      authorName: 'Researcher',
      text: 'Found three museums.'
    });
    const detail = await client.query(api.routes.discussions.research.get.run, { discussionId });
    if (!detail.threadId) throw new Error('Expected a thread');
    const messages = await client.query(api.routes.discussions.messages.list.run, {
      discussionId,
      paginationOpts,
      threadId: detail.threadId
    });
    expect(messages.page).toEqual([
      expect.objectContaining({
        author: { name: 'Researcher', userId: 'groam-ai' },
        role: 'assistant'
      })
    ]);
  }
);
