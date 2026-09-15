import { expect, test } from 'vitest';
import { api } from '#convex-generated/api';
import { setupWritableTrip, tripActivityInput, tripLocationInput } from '#testing/trips';

const workspaceScreen = {
  capabilities: [] as [],
  data: '{}',
  description: 'Workspace home',
  key: 'workspace:home',
  target: { kind: 'workspace' as const },
  title: 'Home'
};

test('creates native Agent chats and stores verified entity tags in thread metadata', async () => {
  const { owner, tripId } = await setupWritableTrip(0);
  const destinationId = await owner.client.mutation(api.routes.trips.destinations.add.run, {
    input: tripLocationInput({ name: 'Lisbon, Portugal' }),
    tripId
  });
  const activityId = await owner.client.mutation(api.routes.trips.destinations.activities.add.run, {
    destinationId,
    input: tripActivityInput({ title: 'Alfama walk' }),
    tripId
  });

  const threadId = await owner.client.action(api.routes.assistant.chats.create.run, {
    screen: workspaceScreen
  });
  await expect(owner.client.query(api.routes.assistant.chats.list.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: threadId, tags: [], title: 'New AI chat' })
    ])
  );

  const catalog = await owner.client.query(api.routes.assistant.context.catalog.run, {});
  expect(catalog).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: tripId, kind: 'trip' }),
      expect.objectContaining({ id: destinationId, kind: 'destination' }),
      expect.objectContaining({ id: activityId, kind: 'activity' })
    ])
  );

  await expect(
    owner.test.mutation(api.routes.assistant.stop.run, { order: 1, threadId })
  ).rejects.toThrow();
  await expect(
    owner.client.mutation(api.routes.assistant.stop.run, { order: 1, threadId })
  ).resolves.toBe(false);

  await owner.client.mutation(api.routes.assistant.chats.tags.run, {
    tags: [
      { id: tripId, kind: 'trip' },
      { id: activityId, kind: 'activity' }
    ],
    threadId
  });

  await expect(owner.client.query(api.routes.assistant.chats.list.run, {})).resolves.toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: threadId,
        tags: [
          { id: tripId, kind: 'trip', label: 'Summer beach idea', tripId },
          { id: activityId, kind: 'activity', label: 'Alfama walk', tripId }
        ]
      })
    ])
  );
});
