import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useTripProposalDetail, useTripVersion, useTripVersions } from './use-trip-versions';

const convex = vi.hoisted(() => ({
  useAction: vi.fn(),
  useMutation: vi.fn(),
  useQuery: vi.fn()
}));
const notifications = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));

const tripId = 'trip-1' as Id<'trips'>;
const proposalId = 'proposal-1' as Id<'tripProposals'>;

beforeEach(() => {
  vi.clearAllMocks();
  convex.useAction.mockReturnValue(vi.fn().mockResolvedValue(null));
  convex.useMutation.mockReturnValue(vi.fn().mockResolvedValue(null));
  convex.useQuery.mockReturnValue([]);
});

test('creates an isolated version and returns its working trip', async () => {
  const create = vi.fn().mockResolvedValue({ proposalId, workingTripId: tripId });
  convex.useMutation.mockReturnValue(create);
  const { result } = renderHook(() => useTripVersions(tripId));

  let version = null;
  await act(async () => {
    version = await result.current.createVersion();
  });

  expect(create).toHaveBeenCalledWith({ tripId });
  expect(version).toEqual({ proposalId, workingTripId: tripId });
});

test('passes a custom idea name to Convex', async () => {
  const create = vi.fn().mockResolvedValue({ proposalId, workingTripId: tripId });
  convex.useMutation.mockReturnValue(create);
  const { result } = renderHook(() => useTripVersions(tripId));

  await act(async () => {
    await result.current.createVersion({ ideaName: 'itinerary/add-coast-day' });
  });

  expect(create).toHaveBeenCalledWith({ ideaName: 'itinerary/add-coast-day', tripId });
});

test('uses Convex actions for submit, apply, and rebase workflows', async () => {
  const submit = vi.fn().mockResolvedValue(null);
  const merge = vi.fn().mockResolvedValue(null);
  const rebase = vi.fn().mockResolvedValue({ kind: 'applied' });
  convex.useAction
    .mockReturnValueOnce(submit)
    .mockReturnValueOnce(merge)
    .mockReturnValueOnce(rebase);
  const { result } = renderHook(() => useTripVersion(proposalId));

  await act(async () => {
    expect(await result.current.submit()).toBe(true);
    expect(await result.current.merge()).toBe(true);
    expect(await result.current.rebase()).toEqual({ kind: 'applied' });
  });

  expect(submit).toHaveBeenCalledWith({ proposalId });
  expect(merge).toHaveBeenCalledWith({ proposalId });
  expect(rebase).toHaveBeenCalledWith({ proposalId, resolutions: [] });
});

test('reports a clean idea review clearly', async () => {
  const review = vi.fn().mockResolvedValue({ commentCount: 0, summary: 'Looks good.' });
  convex.useAction
    .mockReturnValueOnce(vi.fn())
    .mockReturnValueOnce(vi.fn())
    .mockReturnValueOnce(vi.fn())
    .mockReturnValueOnce(vi.fn())
    .mockReturnValueOnce(review);
  const { result } = renderHook(() => useTripVersion(proposalId));

  await act(async () => {
    expect(await result.current.requestAgentReview()).toBe(true);
  });

  expect(review).toHaveBeenCalledWith({ proposalId });
  expect(notifications.success).toHaveBeenCalledWith(
    'Idea review passed with no blocking concerns.'
  );
});

test('reports failed version actions without claiming success', async () => {
  convex.useAction.mockReturnValue(vi.fn().mockRejectedValue(new Error('Git unavailable')));
  const { result } = renderHook(() => useTripVersion(proposalId));

  await act(async () => {
    expect(await result.current.submit()).toBe(false);
  });
  expect(notifications.error).toHaveBeenCalledWith('Git unavailable');
});

test('skips idea detail queries until a proposal id is available', () => {
  renderHook(() => useTripProposalDetail());
  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
});

test('returns null and toasts when idea creation fails', async () => {
  const create = vi.fn().mockRejectedValue(new Error('Trip is archived'));
  convex.useMutation.mockReturnValue(create);
  const { result } = renderHook(() => useTripVersions(tripId));

  let version = null;
  await act(async () => {
    version = await result.current.createVersion();
  });

  expect(create).toHaveBeenCalledWith({ tripId });
  expect(version).toBeNull();
  expect(notifications.error).toHaveBeenCalledWith('Trip is archived');
});
