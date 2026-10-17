import { expect, test } from 'vite-plus/test';
import { api, internal } from '#convex-generated/api';
import { aiRateLimiter } from '#convex/modules/ai/limits';
import { createOutsiderClient } from '#testing/factory';
import { setupGroup } from '#testing/trips';

const screen = {
  capabilities: [],
  data: '{}',
  description: 'Home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

async function setupRequest() {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Chat member');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Respond'
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: '@groam pick a dinner spot'
  });
  const args = { discussionId, promptMessageId: sent.messageId, screen };
  const request = () =>
    owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
  const runs = () =>
    owner.test.run((ctx) =>
      ctx.db
        .query('agentRuns')
        .withIndex('by_discussionId_and_updatedAt', (query) =>
          query.eq('discussionId', discussionId)
        )
        .collect()
    );
  const messages = () =>
    owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId)
        )
        .collect()
    );
  return { args, discussionId, member, messages, owner, request, runs };
}

test('a second respond for a claimed prompt is a no-op', { timeout: 15_000 }, async () => {
  const setup = await setupRequest();
  await expect(
    setup.owner.client.mutation(internal.modules.discussions.assistant.index.respond, setup.args)
  ).resolves.toBeNull();
  await expect(
    setup.owner.client.mutation(internal.modules.discussions.assistant.index.respond, setup.args)
  ).resolves.toBeNull();
  const runs = await setup.runs();
  expect(runs).toEqual([
    expect.objectContaining({ status: 'running', workflowId: expect.any(String) })
  ]);
  expect((await setup.request())?.assistantStatus).toBe('responding');
});

test(
  'a rate-limited respond fails the claimed request without a reply',
  { timeout: 15_000 },
  async () => {
    const setup = await setupRequest();
    await setup.owner.client.run(async (ctx) => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) throw new Error('Expected an identity');
      await aiRateLimiter.limit(ctx, 'tripAssistantMessage', {
        count: 6,
        key: identity.tokenIdentifier
      });
    });
    const before = (await setup.messages()).length;
    await expect(
      setup.owner.client.mutation(internal.modules.discussions.assistant.index.respond, setup.args)
    ).resolves.toBeNull();
    const request = await setup.request();
    expect(request).toMatchObject({ assistantStatus: 'failed' });
    expect(request?.assistantError).toMatch(/Too many messages\. Try again in \d+ minutes?\./);
    expect(await setup.messages()).toHaveLength(before);
    const runs = await setup.runs();
    expect(runs).toHaveLength(1);
    expect(runs[0]?.workflowId).toBeUndefined();
    expect(runs[0]?.status).toBe('failed');
  }
);

test('an outsider cannot respond to another group’s chat', { timeout: 15_000 }, async () => {
  const setup = await setupRequest();
  const outsider = await createOutsiderClient(setup.owner.test);
  await expect(
    outsider.client.mutation(internal.modules.discussions.assistant.index.respond, setup.args)
  ).rejects.toThrow();
  const runs = await setup.runs();
  expect(runs).toEqual([expect.objectContaining({ status: 'queued' })]);
  expect(runs[0]?.workflowId).toBeUndefined();
});
