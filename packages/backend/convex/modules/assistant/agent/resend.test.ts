import { mockModel } from '@convex-dev/agent';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { api, components } from '#convex-generated/api';
import { AssistantProvider } from '#convex/modules/ai/provider';
import { createOutsiderClient } from '#testing/factory';
import { setupTrip } from '#testing/trips';

// Agent replies stream through scheduled functions, so these tests need real timers.
vi.useRealTimers();
afterEach(() => vi.restoreAllMocks());

const screen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

function reply(text: string) {
  vi.spyOn(AssistantProvider, 'configured').mockResolvedValue({
    languageModel: mockModel({ content: [{ text, type: 'text' }] }),
    modelId: 'test-model'
  } as never);
}

async function threadWithOneTurn() {
  const { owner } = await setupTrip(0);
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, { screen });
  reply('First answer.');
  await owner.client.action(api.routes.assistant.send.run, {
    agent: 'groam',
    prompt: 'Plan Lisbon',
    screen,
    threadId
  });
  const stored = async () =>
    (
      await owner.test.run((ctx) =>
        ctx.runQuery(components.agent.messages.listMessagesByThreadId, {
          order: 'asc',
          paginationOpts: { cursor: null, numItems: 50 },
          threadId
        })
      )
    ).page;
  const prompt = (await stored()).find((message) => message.message?.role === 'user');
  if (!prompt) throw new Error('Expected the prompt message');
  return { owner, prompt, stored, threadId };
}

test('resending a prompt replaces every later message with a new reply', async () => {
  const { owner, prompt, stored, threadId } = await threadWithOneTurn();
  expect((await stored()).map((message) => message.text)).toContain('First answer.');
  reply('Second answer.');
  await owner.client.action(api.routes.assistant.resend.run, {
    agent: 'groam',
    messageId: prompt._id,
    order: prompt.order,
    prompt: 'Plan Lisbon',
    screen,
    stepOrder: prompt.stepOrder,
    threadId
  });
  const texts = (await stored()).map((message) => message.text);
  expect(texts).toContain('Second answer.');
  expect(texts).not.toContain('First answer.');
  expect(texts.filter((text) => text === 'Plan Lisbon')).toHaveLength(1);
});

test.each([
  ['an edited prompt text', { prompt: 'Plan Porto' }],
  ['a stale position', { stepOrderOffset: 1 }],
  ['an assistant message', { assistant: true }]
])('refuses to resend %s', async (_, change) => {
  const { owner, prompt, stored, threadId } = await threadWithOneTurn();
  const assistant = (await stored()).find((message) => message.message?.role === 'assistant');
  if (!assistant) throw new Error('Expected the assistant reply');
  const target = 'assistant' in change ? assistant : prompt;
  await expect(
    owner.client.action(api.routes.assistant.resend.run, {
      agent: 'groam',
      messageId: target._id,
      order: target.order,
      prompt: 'prompt' in change ? change.prompt : (target.text ?? ''),
      screen,
      stepOrder: target.stepOrder + ('stepOrderOffset' in change ? change.stepOrderOffset : 0),
      threadId
    })
  ).rejects.toThrow('The selected assistant message cannot be resent');
  expect((await stored()).map((message) => message.text)).toContain('First answer.');
});

test('another group cannot resend into a private thread', async () => {
  const { owner, prompt, stored, threadId } = await threadWithOneTurn();
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client.action(api.routes.assistant.resend.run, {
      agent: 'groam',
      messageId: prompt._id,
      order: prompt.order,
      prompt: 'Plan Lisbon',
      screen,
      stepOrder: prompt.stepOrder,
      threadId
    })
  ).rejects.toThrow();
  expect((await stored()).map((message) => message.text)).toContain('First answer.');
});

test('resend needs a signed-in caller', async () => {
  const { owner, prompt, threadId } = await threadWithOneTurn();
  await expect(
    owner.test.action(api.routes.assistant.resend.run, {
      agent: 'groam',
      messageId: prompt._id,
      order: prompt.order,
      prompt: 'Plan Lisbon',
      screen,
      stepOrder: prompt.stepOrder,
      threadId
    })
  ).rejects.toThrow('Not authenticated');
});
