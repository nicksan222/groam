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

test('uses skip while versions are disabled and announces a titled idea', async () => {
  const create = vi.fn().mockResolvedValue({ proposalId, workingTripId: tripId });
  convex.useMutation.mockReturnValue(create);
  const { result } = renderHook(() => useTripVersions(tripId, false));

  await act(async () => {
    await result.current.createVersion({
      issueId: 'issue-1' as Id<'tripIssues'>,
      title: 'Coast day'
    });
  });

  expect(convex.useQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  expect(create).toHaveBeenCalledWith({ issueId: 'issue-1', title: 'Coast day', tripId });
  expect(notifications.success).toHaveBeenCalledWith('Idea created: Coast day');
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

test('runs approval, close, feedback, reviewer, resolve, and agent-review workflows', async () => {
  const action = vi.fn().mockResolvedValue({ commentCount: 2 });
  const mutation = vi.fn().mockResolvedValue(null);
  convex.useAction.mockReturnValue(action);
  convex.useMutation.mockReturnValue(mutation);
  const { result } = renderHook(() => useTripVersion(proposalId));

  await act(async () => {
    expect(await result.current.approve(false)).toBe(true);
    expect(await result.current.close('No longer needed')).toBe(true);
    expect(
      await result.current.addFeedback(
        'Needs detail',
        'comment-1' as Id<'tripProposalComments'>,
        'details/name',
        'change_request'
      )
    ).toBe(true);
    expect(
      await result.current.resolveFeedback('comment-1' as Id<'tripProposalComments'>, true)
    ).toBe(true);
    expect(
      await result.current.setReviewers([{ kind: 'user', name: 'Sam', userId: 'user-sam' }])
    ).toBe(true);
    expect(await result.current.resolve([{ choice: 'current', path: 'details/name' }])).toBe(true);
    expect(await result.current.requestAgentReview()).toBe(true);
  });

  expect(mutation).toHaveBeenCalledWith({ approved: false, proposalId });
  expect(notifications.success).toHaveBeenCalledWith('Approval removed');
  expect(notifications.success).toHaveBeenCalledWith('Idea reviewer requested 2 changes.');
});

test('returns null and reports failed rebases and agent reviews', async () => {
  const failed = vi.fn().mockRejectedValue(new Error('Remote unavailable'));
  convex.useAction.mockReturnValue(failed);
  const { result } = renderHook(() => useTripVersion(proposalId));

  await act(async () => {
    expect(await result.current.rebase([{ choice: 'proposed', path: 'details/name' }])).toBeNull();
    expect(await result.current.requestAgentReview()).toBe(false);
  });
  expect(notifications.error).toHaveBeenCalledWith('Remote unavailable');
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
