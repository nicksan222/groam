import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { toggleContextTagReferences, useAssistantChats } from './use-assistant-chats';

const mocks = vi.hoisted(() => ({
  catalog: [
    {
      description: 'Trip',
      id: 'trip-1',
      kind: 'trip',
      label: 'Portugal',
      tripId: 'trip-1'
    }
  ],
  chats: [
    {
      createdAt: 1,
      id: 'thread-1',
      status: 'active',
      tags: [],
      title: 'Portugal ideas',
      updatedAt: 1
    }
  ],
  create: vi.fn(),
  error: vi.fn(),
  queryIndex: 0,
  setTags: vi.fn()
}));

vi.mock('convex/react', () => ({
  useAction: () => mocks.create,
  useMutation: () => mocks.setTags,
  useQuery: () => (mocks.queryIndex++ % 2 === 0 ? mocks.chats : mocks.catalog)
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: mocks.error }
}));

beforeEach(() => {
  mocks.queryIndex = 0;
  vi.clearAllMocks();
  mocks.create.mockResolvedValue('thread-2');
  mocks.setTags.mockResolvedValue([]);
});

test('lists chats and creates a new durable Agent thread', async () => {
  const { result } = renderHook(() => useAssistantChats());

  expect(result.current.chats).toEqual(mocks.chats);
  expect(result.current.catalog).toEqual(mocks.catalog);
  let threadId: string | null = null;
  await act(async () => {
    threadId = await result.current.createChat({
      capabilities: [],
      data: {},
      description: 'Trips in this group',
      key: 'trips:list',
      title: 'Trips'
    });
  });

  expect(threadId).toBe('thread-2');
  expect(mocks.create).toHaveBeenCalledWith({
    screen: {
      capabilities: [],
      data: '{}',
      description: 'Trips in this group',
      key: 'trips:list',
      target: { kind: 'workspace' },
      title: 'Trips'
    }
  });
});

test('updates typed context tags and reports failures', async () => {
  const { result } = renderHook(() => useAssistantChats());
  await act(() => result.current.setTags('thread-1', [{ id: 'trip-1', kind: 'trip' }]));
  expect(mocks.setTags).toHaveBeenCalledWith({
    tags: [{ id: 'trip-1', kind: 'trip' }],
    threadId: 'thread-1'
  });

  mocks.setTags.mockRejectedValueOnce(new Error('Tag update failed'));
  await act(() => result.current.setTags('thread-1', []));
  expect(mocks.error).toHaveBeenCalledWith('Tag update failed');
});

test('projects and toggles stored context attachments', () => {
  const tags = [
    { id: 'activity-1', kind: 'activity' as const, label: 'Alfama walk', tripId: 'trip-1' }
  ];
  expect(toggleContextTagReferences(tags, { id: 'trip-1', kind: 'trip' }, true)).toEqual([
    { id: 'activity-1', kind: 'activity' },
    { id: 'trip-1', kind: 'trip' }
  ]);
  expect(toggleContextTagReferences(tags, { id: 'activity-1', kind: 'activity' }, false)).toEqual(
    []
  );
});
