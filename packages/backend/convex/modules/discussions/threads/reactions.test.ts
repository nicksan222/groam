import { expect, test } from 'vite-plus/test';
import { api } from '#convex-generated/api';
import { createOutsiderClient } from '#testing/factory';
import { setupGroup } from '#testing/trips';

async function chatWithMessage() {
  const { addUser, owner } = await setupGroup();
  const member = await addUser('Chat member');
  const discussionId = await owner.client.mutation(api.routes.discussions.create.run, {
    clientRequestId: crypto.randomUUID(),
    memberUserIds: [member.userId],
    title: 'Reactions'
  });
  const sent = await owner.client.mutation(api.routes.discussions.messages.send.run, {
    clientRequestId: crypto.randomUUID(),
    discussionId,
    text: 'Sushi on Friday?'
  });
  const receipt = () =>
    owner.test.run((ctx) =>
      ctx.db
        .query('discussionMessages')
        .withIndex('by_discussionId_and_agentMessageId', (query) =>
          query.eq('discussionId', discussionId).eq('agentMessageId', sent.messageId)
        )
        .unique()
    );
  return { discussionId, member, messageId: sent.messageId, owner, receipt };
}

test('a reaction toggles on and off and lists per person', { timeout: 15_000 }, async () => {
  const { discussionId, member, messageId, owner } = await chatWithMessage();
  const react = (client: typeof owner.client, emoji: string) =>
    client.mutation(api.routes.discussions.messages.react.run, { discussionId, emoji, messageId });
  await react(owner.client, ' 👍 ');
  await react(member.client, '👍');
  await react(member.client, '🎉');
  const listed = await member.client.query(api.routes.discussions.messages.reactions.run, {
    discussionId
  });
  expect(listed).toHaveLength(3);
  expect(listed).toEqual(
    expect.arrayContaining([
      { emoji: '👍', messageId, userId: owner.userId },
      { emoji: '👍', messageId, userId: member.userId },
      { emoji: '🎉', messageId, userId: member.userId }
    ])
  );
  await react(member.client, '👍');
  await expect(
    owner.client.query(api.routes.discussions.messages.reactions.run, { discussionId })
  ).resolves.toEqual(
    expect.not.arrayContaining([{ emoji: '👍', messageId, userId: member.userId }])
  );
});

test.each(['', '   ', 'not an emoji'])(
  'refuses the reaction %j',
  { timeout: 15_000 },
  async (emoji) => {
    const { discussionId, messageId, owner } = await chatWithMessage();
    await expect(
      owner.client.mutation(api.routes.discussions.messages.react.run, {
        discussionId,
        emoji,
        messageId
      })
    ).rejects.toThrow('Reaction must be a short emoji');
  }
);

test('outsiders cannot react to or read reactions', { timeout: 15_000 }, async () => {
  const { discussionId, messageId, owner } = await chatWithMessage();
  const outsider = await createOutsiderClient(owner.test);
  await expect(
    outsider.client.mutation(api.routes.discussions.messages.react.run, {
      discussionId,
      emoji: '👍',
      messageId
    })
  ).rejects.toThrow();
  await expect(
    outsider.client.query(api.routes.discussions.messages.reactions.run, { discussionId })
  ).rejects.toThrow();
});

test('only the author edits or deletes a message', { timeout: 15_000 }, async () => {
  const { discussionId, member, messageId, owner, receipt } = await chatWithMessage();
  await expect(
    member.client.mutation(api.routes.discussions.messages.edit.run, {
      discussionId,
      messageId,
      text: 'Hijacked'
    })
  ).rejects.toThrow('You can only edit your own messages');
  await expect(
    member.client.mutation(api.routes.discussions.messages.remove.run, { discussionId, messageId })
  ).rejects.toThrow('You can only delete your own messages');
  await expect(
    owner.client.mutation(api.routes.discussions.messages.edit.run, {
      discussionId,
      messageId: 'missing-message',
      text: 'Nope'
    })
  ).rejects.toThrow('You can only edit your own messages');

  await owner.client.mutation(api.routes.discussions.messages.edit.run, {
    discussionId,
    messageId,
    text: 'Sushi on Saturday?'
  });
  expect(await receipt()).toMatchObject({
    content: { text: 'Sushi on Saturday?' },
    editedAt: expect.any(Number)
  });

  await owner.client.mutation(api.routes.discussions.messages.remove.run, {
    discussionId,
    messageId
  });
  const deleted = await receipt();
  expect(deleted).toMatchObject({ content: { text: '' }, deletedAt: expect.any(Number) });
  // Deleting again is a no-op that keeps the first deletion time.
  await owner.client.mutation(api.routes.discussions.messages.remove.run, {
    discussionId,
    messageId
  });
  expect((await receipt())?.deletedAt).toBe(deleted?.deletedAt);
});
