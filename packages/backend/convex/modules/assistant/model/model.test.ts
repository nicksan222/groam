import { expect, test } from 'vitest';
import { api, internal } from '#convex-generated/api';
import type { Id } from '#convex-generated/dataModel';
import { setupGroup, setupTrip, tripInput } from '#testing/trips';

const workspaceScreen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

test('refuses private assistant thread access for another workspace member', async () => {
  const { addUser, owner } = await setupGroup();
  const otherMember = await addUser('Other traveler');
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });

  await expect(
    otherMember.client.query(api.routes.assistant.messages.run, {
      paginationOpts: { cursor: null, numItems: 10 },
      threadId
    })
  ).rejects.toThrow('Assistant conversation not found');
});

test('refuses context tag updates on another member private chat', async () => {
  const { addUser, owner, tripId } = await setupTrip(1);
  const otherMember = await addUser('Other traveler');
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });

  await expect(
    otherMember.client.mutation(api.routes.assistant.chats.tags.run, {
      tags: [{ id: tripId, kind: 'trip' }],
      threadId
    })
  ).rejects.toThrow('Assistant conversation not found');
});

test('refuses tagging destinations that do not exist', async () => {
  const { owner } = await setupTrip(0);
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });

  await expect(
    owner.client.mutation(api.routes.assistant.chats.tags.run, {
      tags: [
        {
          id: '000000000000000000000099999tripDestinations' as Id<'tripDestinations'>,
          kind: 'destination'
        }
      ],
      threadId
    })
  ).rejects.toThrow('Tagged destination not found');
});

test('refuses screen context updates on another member private chat', async () => {
  const { addUser, owner } = await setupGroup();
  const otherMember = await addUser('Other traveler');
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });

  await expect(
    otherMember.client.mutation(api.routes.assistant.context.screen.run, {
      screen: workspaceScreen,
      threadId
    })
  ).rejects.toThrow('Assistant conversation not found');
});

test('scopes context catalog to the signed-in workspace', async () => {
  const first = await setupTrip(0);
  const second = await setupTrip(0);
  const uniqueName = `Catalog scope ${crypto.randomUUID()}`;
  await first.owner.client.action(api.routes.trips.create.run, {
    input: tripInput({ name: uniqueName })
  });
  const threadId = await first.owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });

  const firstCatalog = await first.owner.client.query(api.routes.assistant.context.catalog.run, {});
  const secondCatalog = await second.owner.client.query(
    api.routes.assistant.context.catalog.run,
    {}
  );

  expect(firstCatalog.some((item) => item.label === uniqueName)).toBe(true);
  expect(secondCatalog.some((item) => item.label === uniqueName)).toBe(false);

  await expect(
    first.owner.client.query(internal.modules.assistant.model.index.access, { threadId })
  ).resolves.toMatchObject({
    organizationId: expect.any(String),
    tags: [],
    userId: expect.any(String)
  });
});

test('rejects more than the maximum number of context tags', async () => {
  const { owner, tripId } = await setupTrip(0);
  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });
  const tags = Array.from({ length: 13 }, () => ({
    id: tripId,
    kind: 'trip' as const
  }));

  await expect(
    owner.client.mutation(api.routes.assistant.chats.tags.run, { tags, threadId })
  ).rejects.toThrow('An AI chat can have at most 12 context tags');
});
