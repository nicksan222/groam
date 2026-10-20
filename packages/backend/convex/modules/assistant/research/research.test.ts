import { createOpenAI } from '@ai-sdk/openai';
import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

afterEach(() => vi.restoreAllMocks());

async function researchPage() {
  const trip = await setupTrip(2);
  const discussionId = await trip.owner.client.mutation(
    api.routes.discussions.research.create.run,
    {
      tripId: trip.tripId,
      title: 'Lisbon museums',
      brief: 'Find accessible choices',
      clientRequestId: crypto.randomUUID()
    }
  );
  return { ...trip, discussionId };
}

test(
  'research starts a durable run once, preserving the initiating actor',
  { timeout: 20_000 },
  async () => {
    const { owner, discussionId, users } = await researchPage();
    const args = { discussionId, topic: '  Accessible museums  ', effort: 'standard' as const };
    const first = await owner.client.mutation(api.routes.discussions.research.start.run, args);
    expect(await owner.client.mutation(api.routes.discussions.research.start.run, args)).toBe(
      first
    );
    const run = await owner.client.query(api.routes.discussions.research.latest.run, {
      discussionId
    });
    expect(run).toMatchObject({
      id: first,
      status: 'queued',
      surface: 'standalone',
      agentId: 'researcher',
      createdBy: { userId: owner.userId },
      researchTask: { topic: 'Accessible museums', effort: 'standard' }
    });
    expect(
      await owner.client.mutation(internal.modules.assistant.engine.functions.claimInline, {
        runId: first
      })
    ).toBeNull();
    const member = users[0];
    if (!member) throw new Error('Missing member');
    // Shared research visibility does not require that a viewer posted a note first.
    expect(
      await member.client.query(api.routes.agents.runs.get.run, { runId: first })
    ).toMatchObject({ id: first });
  }
);

test(
  'outsiders and archived trips cannot start research; invalid topics and efforts fail',
  { timeout: 20_000 },
  async () => {
    const { owner, discussionId, tripId } = await researchPage();
    const args = { discussionId, topic: 'Museums', effort: 'quick' as const };
    const outsider = await createOutsiderClient(owner.test);
    await expect(
      outsider.client.mutation(api.routes.discussions.research.start.run, args)
    ).rejects.toThrow('Discussion not found');
    await expect(
      outsider.client.query(api.routes.discussions.research.latest.run, { discussionId })
    ).rejects.toThrow('Discussion not found');
    await expect(
      owner.client.mutation(api.routes.discussions.research.start.run, { ...args, topic: '  ' })
    ).rejects.toThrow('Research topics');
    await expect(
      owner.client.mutation(api.routes.discussions.research.start.run, {
        ...args,
        effort: 'infinite' as 'quick'
      })
    ).rejects.toThrow();
    await owner.client.mutation(api.routes.trips.archive.run, { tripId });
    await expect(
      owner.client.mutation(api.routes.discussions.research.start.run, args)
    ).rejects.toThrow('This trip is archived');
  }
);

function modelWithSearch() {
  const model = mockModel({
    contentSteps: [
      [
        {
          type: 'tool-call',
          toolName: 'researchWeb',
          toolCallId: 'research-1',
          input: JSON.stringify({ query: 'Lisbon accessible museum official' })
        }
      ],
      [
        {
          type: 'tool-call',
          toolName: 'web_search',
          toolCallId: 'search-1',
          input: '{}',
          providerExecuted: true
        },
        {
          type: 'tool-result',
          toolName: 'web_search',
          toolCallId: 'search-1',
          result: { status: 'completed' }
        },
        {
          type: 'source',
          sourceType: 'url',
          id: 'official',
          url: 'https://example.com/museum',
          title: 'Official museum access'
        },
        { type: 'text', text: 'The museum offers step-free access.' }
      ],
      [{ type: 'text', text: 'Choose this museum. [Official source](https://example.com/museum)' }]
    ]
  });
  const provider = vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    modelId: 'test',
    languageModel: model,
    providerTools: { web_search: createOpenAI({ apiKey: 'test' }).tools.webSearch({}) }
  });
  return { generate: vi.spyOn(model, 'doGenerate'), provider };
}

test(
  'delegation executes real Agent steps, returns native citations and stores the report',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    const { generate, provider } = modelWithSearch();
    const result = await owner.client.action(
      internal.modules.assistant.research.functions.delegate,
      { tripId, topic: 'Accessible museums', effort: 'deep' }
    );
    expect(generate).toHaveBeenCalledTimes(3);
    expect(generate.mock.calls[0]?.[0].toolChoice).toEqual({ type: 'required' });
    expect(provider).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: owner.userId }),
      { research: { searchContextSize: 'high' } }
    );
    expect(result).toMatchObject({
      effort: 'deep',
      incomplete: false,
      sources: [{ url: 'https://example.com/museum', title: 'Official museum access' }]
    });
    expect(result.report).toContain('## Sources');
    const run = await owner.client.query(api.routes.agents.runs.get.run, { runId: result.runId });
    expect(run).toMatchObject({ status: 'complete', report: result.report });
    const events = await owner.client.query(api.routes.agents.runs.events.run, {
      runId: result.runId,
      paginationOpts: { cursor: null, numItems: 25 }
    });
    expect(events.page.some((event) => event.kind === 'tool')).toBe(true);
  }
);

test(
  'a provider that skips search cannot be reported as successful research',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    modelWithSearch();
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      modelId: 'test',
      languageModel: mockModel({ content: [{ type: 'text', text: 'An unsupported guess' }] }),
      providerTools: { web_search: createOpenAI({ apiKey: 'test' }).tools.webSearch({}) }
    });
    await expect(
      owner.client.action(internal.modules.assistant.research.functions.delegate, {
        tripId,
        topic: 'Museums',
        effort: 'quick'
      })
    ).rejects.toThrow();
  }
);

async function runningParent(
  owner: Awaited<ReturnType<typeof setupTrip>>['owner'],
  tripId: Awaited<ReturnType<typeof setupTrip>>['tripId']
) {
  const issueId = await owner.client.mutation(api.routes.trips.issues.create.run, {
    tripId,
    title: 'Plan museum visits',
    body: 'Check accessible choices'
  });
  const runId = await owner.client.mutation(api.routes.trips.issues.assign.run, {
    issueId,
    assignee: { agentId: 'issue', kind: 'agent', name: 'Issue agent' }
  });
  if (!runId) throw new Error('Missing parent');
  await owner.client.mutation(internal.modules.assistant.engine.functions.claimTurn, { runId });
  return runId;
}

test(
  'background delegation keeps the parent actor and private report visibility',
  { timeout: 20_000 },
  async () => {
    const { owner, users, tripId } = await setupTrip(2);
    const parentRunId = await runningParent(owner, tripId);
    const { provider } = modelWithSearch();
    const result = await owner.test.action(internal.modules.assistant.research.functions.delegate, {
      asRun: parentRunId,
      tripId,
      topic: 'Private museum preferences',
      effort: 'standard'
    });
    expect(provider).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ userId: owner.userId }),
      { research: { searchContextSize: 'medium' } }
    );
    expect(
      await owner.client.query(api.routes.agents.runs.get.run, { runId: result.runId })
    ).toMatchObject({ researchTask: { parentRunId }, status: 'complete' });
    const member = users[0];
    if (!member) throw new Error('Missing member');
    await expect(
      member.client.query(api.routes.agents.runs.get.run, { runId: result.runId })
    ).rejects.toThrow('Agent run not found');
    expect(
      await member.client.query(api.routes.agents.get.run, { agentId: 'researcher' })
    ).toMatchObject({ latestRun: null, activeRunCount: 0 });
  }
);

test(
  'stopping a parent stops its child before further model calls',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    const parentRunId = await runningParent(owner, tripId);
    const { provider, generate } = modelWithSearch();
    const configuration = await provider.getMockImplementation()?.({} as never, {} as never);
    if (!configuration) throw new Error('Missing model');
    provider.mockImplementation(async () => {
      await owner.client.mutation(api.routes.agents.runs.stop.run, { runId: parentRunId });
      return configuration;
    });
    await expect(
      owner.test.action(internal.modules.assistant.research.functions.delegate, {
        asRun: parentRunId,
        tripId,
        topic: 'Museums',
        effort: 'deep'
      })
    ).rejects.toThrow('did not complete');
    expect(generate).not.toHaveBeenCalled();
    const runs = await owner.client.query(api.routes.agents.runs.list.run, {
      agentId: 'researcher',
      paginationOpts: { cursor: null, numItems: 10 }
    });
    expect(runs.page[0]).toMatchObject({ status: 'aborted', report: null });
  }
);

test(
  'quick effort enforces two hosted requests even when the model asks for three at once',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    const native = [
      {
        type: 'tool-call' as const,
        toolName: 'web_search',
        toolCallId: 'hosted',
        input: '{}',
        providerExecuted: true
      },
      {
        type: 'tool-result' as const,
        toolName: 'web_search',
        toolCallId: 'hosted',
        result: { status: 'completed' }
      },
      {
        type: 'source' as const,
        sourceType: 'url' as const,
        id: 'source',
        url: 'https://example.com/museum',
        title: 'Museum'
      },
      { type: 'text' as const, text: 'Accessible museum.' }
    ];
    const model = mockModel({
      contentSteps: [
        [1, 2, 3].map((index) => ({
          type: 'tool-call',
          toolName: 'researchWeb',
          toolCallId: `local-${index}`,
          input: JSON.stringify({ query: `Museum question ${index}` })
        })),
        native,
        native,
        [{ type: 'text', text: 'A limited museum comparison.' }]
      ]
    });
    const generate = vi.spyOn(model, 'doGenerate');
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      modelId: 'test',
      languageModel: model,
      providerTools: { web_search: createOpenAI({ apiKey: 'test' }).tools.webSearch({}) }
    });
    const result = await owner.client.action(
      internal.modules.assistant.research.functions.delegate,
      { tripId, topic: 'Museums', effort: 'quick' }
    );
    expect(generate).toHaveBeenCalledTimes(4);
    expect(generate.mock.calls.at(-1)?.[0].toolChoice).toEqual({ type: 'none' });
    expect(result.incomplete).toBe(true);
    expect(result.report).toContain('budget was reached');
  }
);

test(
  'a failed hosted search cannot become a successful guessed report',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    const model = mockModel({
      contentSteps: [
        [
          {
            type: 'tool-call',
            toolName: 'researchWeb',
            toolCallId: 'local-1',
            input: JSON.stringify({ query: 'Museums' })
          }
        ],
        [{ type: 'text', text: 'I skipped the requested web search.' }],
        [{ type: 'text', text: 'An unsupported museum recommendation.' }]
      ]
    });
    vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
      modelId: 'test',
      languageModel: model,
      providerTools: { web_search: createOpenAI({ apiKey: 'test' }).tools.webSearch({}) }
    });
    await expect(
      owner.client.action(internal.modules.assistant.research.functions.delegate, {
        tripId,
        topic: 'Museums',
        effort: 'quick'
      })
    ).rejects.toThrow('did not search the web');
    const runs = await owner.client.query(api.routes.agents.runs.list.run, {
      agentId: 'researcher',
      paginationOpts: { cursor: null, numItems: 10 }
    });
    expect(runs.page[0]).toMatchObject({ status: 'failed', report: null });
  }
);

test(
  'research delegation is capped at three children per active parent',
  { timeout: 20_000 },
  async () => {
    const { owner, tripId } = await setupTrip();
    const parentRunId = await runningParent(owner, tripId);
    const queue = (topic: string) =>
      owner.client.mutation(internal.modules.assistant.research.functions.queue, {
        tripId,
        topic,
        effort: 'quick',
        asRun: parentRunId,
        sourceRunId: parentRunId
      });
    await queue('Museums');
    await queue('Opening hours');
    await queue('Transport');
    await expect(queue('More transport')).rejects.toThrow('delegation budget');
  }
);

test(
  'a completed page report becomes reusable research context with citations',
  { timeout: 20_000 },
  async () => {
    const { owner, discussionId } = await researchPage();
    modelWithSearch();
    const runId = await owner.client.mutation(api.routes.discussions.research.start.run, {
      discussionId,
      topic: 'Accessible museums',
      effort: 'standard'
    });
    expect(await owner.test.action(internal.modules.assistant.engine.turn.run, { runId })).toEqual({
      kind: 'done'
    });
    await owner.test.mutation(internal.modules.assistant.engine.functions.onComplete, {
      context: { runId },
      workflowId: 'test-workflow' as never,
      result: { kind: 'success', returnValue: { kind: 'done' } }
    });
    const latest = await owner.client.query(api.routes.discussions.research.latest.run, {
      discussionId
    });
    expect(latest).toMatchObject({
      status: 'complete',
      report: expect.stringContaining('## Sources')
    });
    const context = await owner.client.query(internal.modules.discussions.research.tools.read, {
      discussionId
    });
    expect(context.latestReport).toEqual({
      report: latest?.report,
      sources: [{ url: 'https://example.com/museum', title: 'Official museum access' }]
    });
  }
);
