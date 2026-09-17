import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { CreateTripInput } from './use-trips';
import { useTrip, useTrips, useWorkspaceTripProposals } from './use-trips';

const convex = vi.hoisted(() => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  usePaginatedQuery: vi.fn(),
  useQuery: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn() }));
const storage = vi.hoisted(() => ({
  storageIdFromUploadResponse: vi.fn(),
  uploadToConvexStorage: vi.fn()
}));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));
vi.mock('@/features/media/convex-storage-upload', () => storage);
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useWorkspace: () => ({ activeOrganization: { members: [] } })
}));
vi.mock('./use-ensure-destination-covers', () => ({ useEnsureDestinationCovers: vi.fn() }));
vi.mock('./use-ensure-trip-cover', () => ({ useEnsureTripCover: vi.fn() }));

const input = { name: 'Portugal in spring' } as CreateTripInput;

beforeEach(() => {
  vi.clearAllMocks();
  convex.usePaginatedQuery.mockReturnValue({
    loadMore: vi.fn(),
    results: [{ id: 'trip-1', name: 'Portugal' }],
    status: 'CanLoadMore'
  });
  convex.useAction.mockReturnValue(vi.fn().mockResolvedValue('trip-1'));
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue('https://upload.example'));
});

describe('useTrips', () => {
  test('uses requested list options and creates a trip without a cover upload', async () => {
    const create = vi.fn().mockResolvedValue('trip-1');
    const upload = vi.fn();
    convex.useAction.mockReturnValue(create);
    convex.useMutation.mockReturnValue(upload);
    const { result } = renderHook(() => useTrips({ includeArchived: false, initialNumItems: 10 }));

    await act(async () => {
      expect(await result.current.createTrip(input, null)).toBe('trip-1');
    });

    expect(convex.usePaginatedQuery).toHaveBeenCalledWith(
      expect.anything(),
      { includeArchived: false },
      { initialNumItems: 10 }
    );
    expect(create).toHaveBeenCalledWith({ input });
    expect(upload).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  test('uploads a supported cover before creating and reports invalid files', async () => {
    const create = vi.fn().mockResolvedValue('trip-1');
    const upload = vi.fn().mockResolvedValue('https://upload.example');
    convex.useAction.mockReturnValue(create);
    convex.useMutation.mockReturnValue(upload);
    storage.uploadToConvexStorage.mockResolvedValue({
      ok: true,
      json: async () => ({ storageId: 'raw-id' })
    });
    storage.storageIdFromUploadResponse.mockReturnValue('storage-1');
    const { result } = renderHook(() => useTrips());
    const valid = new File(['cover'], 'cover.png', { type: 'image/png' });

    await act(async () => {
      await result.current.createTrip(input, valid);
    });
    expect(storage.uploadToConvexStorage).toHaveBeenCalledWith(
      'https://upload.example',
      valid,
      'image/png'
    );
    expect(create).toHaveBeenCalledWith({
      input: { ...input, coverContentType: 'image/png', coverStorageId: 'storage-1' }
    });

    await act(async () => {
      expect(
        await result.current.createTrip(input, new File(['x'], 'cover.gif', { type: 'image/gif' }))
      ).toBeNull();
    });
    expect(notifications.error).toHaveBeenCalledWith(
      'Choose a JPEG, PNG, WebP, or AVIF image that is 25 MB or smaller'
    );
  });
});

test('skips trip pagination on request and exposes workspace proposals', () => {
  const skipped = renderHook(() => useTrips('skip'));
  expect(convex.usePaginatedQuery).toHaveBeenCalledWith(expect.anything(), 'skip', {
    initialNumItems: 25
  });
  expect(skipped.result.current.trips).toEqual([{ id: 'trip-1', name: 'Portugal' }]);

  const proposals = renderHook(() => useWorkspaceTripProposals({ initialNumItems: 5 }));
  expect(convex.usePaginatedQuery).toHaveBeenLastCalledWith(
    expect.anything(),
    {},
    { initialNumItems: 5 }
  );
  expect(proposals.result.current.proposals).toEqual([{ id: 'trip-1', name: 'Portugal' }]);
});

test('exposes trip mutations for planning, travel details, and cover management', async () => {
  const mutations = Array.from({ length: 22 }, () => vi.fn().mockResolvedValue(null));
  const cover = vi.fn().mockResolvedValue(null);
  convex.useMutation.mockImplementation(() => mutations.shift());
  convex.useAction.mockReturnValue(cover);
  convex.useQuery.mockReturnValue({ id: 'trip-1', name: 'Portugal' });
  storage.uploadToConvexStorage.mockResolvedValue({
    ok: true,
    json: async () => ({ storageId: 'raw' })
  });
  storage.storageIdFromUploadResponse.mockReturnValue('cover-storage');
  const { result } = renderHook(() => useTrip('trip-1' as never));

  await act(async () => {
    await result.current.archive();
    await result.current.restore();
    await result.current.update({ name: 'Renamed' } as never);
    await result.current.addDestination({ name: 'Porto' } as never);
    await result.current.moveDestination('destination-1' as never, 'later');
    await result.current.removeDestination('destination-1' as never);
    await result.current.updateDestination('destination-1' as never, {} as never);
    await result.current.addActivity('destination-1' as never, {} as never);
    await result.current.removeActivity('activity-1' as never);
    await result.current.reorderActivities('destination-1' as never);
    await result.current.updateActivity('activity-1' as never, {} as never);
    await result.current.addStay('destination-1' as never, {} as never);
    await result.current.removeStay('stay-1' as never);
    await result.current.updateStay('stay-1' as never, {} as never);
    await result.current.removeActivityTransfer('transfer-1' as never);
    await result.current.removeBoundaryTransfer('transfer-1' as never);
    await result.current.removeDestinationTransfer('transfer-1' as never);
    await result.current.setActivityTransfer(
      'activity-1' as never,
      'activity-2' as never,
      {} as never
    );
    await result.current.setBoundaryTransfer('arrival', {} as never);
    await result.current.setDestinationTransfer(
      'destination-1' as never,
      'destination-2' as never,
      {} as never
    );
    await result.current.retryCover();
    await result.current.replaceCover(new File(['cover'], 'cover.jpg', { type: 'image/jpeg' }));
  });

  expect(mutations).toEqual([]);
  expect(cover).toHaveBeenCalledWith({
    contentType: 'image/jpeg',
    storageId: 'cover-storage',
    tripId: 'trip-1'
  });
  expect(result.current.exists).toBe(true);
  expect(result.current.trip).toMatchObject({ groupMemberCount: 0, name: 'Portugal' });
});

test('reports failed trip actions and treats null or loading trips as absent', async () => {
  const failedArchive = vi.fn().mockRejectedValue(new Error('Read only'));
  convex.useMutation.mockReturnValue(failedArchive);
  convex.useQuery.mockReturnValue(null);
  const missing = renderHook(() => useTrip('trip-1' as never));
  await act(async () => {
    expect(await missing.result.current.archive()).toBe(false);
  });
  expect(notifications.error).toHaveBeenCalledWith('Read only');
  expect(missing.result.current.exists).toBe(false);
  expect(missing.result.current.trip).toBeUndefined();

  convex.useQuery.mockReturnValue(undefined);
  const loading = renderHook(() => useTrip('trip-1' as never));
  expect(loading.result.current.exists).toBeUndefined();
});
