import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useIdeaCloneWorkspace } from './use-idea-clone-workspace';

const deps = vi.hoisted(() => ({
  confirm: vi.fn(),
  navigate: vi.fn(),
  openPanel: vi.fn(),
  run: vi.fn(),
  useIdeaContext: vi.fn(),
  useOptionalWorkspace: vi.fn(),
  useProposalActionRunner: vi.fn(),
  useReadyValue: vi.fn(),
  useTrip: vi.fn(),
  useTripAgentContext: vi.fn(),
  useTripVersion: vi.fn()
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => deps.navigate }));
vi.mock('./use-idea-context', () => ({ useIdeaContext: () => deps.useIdeaContext() }));
vi.mock('@/features/trips/hooks/use-proposal-action-runner', () => ({
  useProposalActionRunner: () => deps.useProposalActionRunner()
}));
vi.mock('@/features/trips/hooks/use-trip-agent-context', () => ({
  useTripAgentContext: (...args: unknown[]) => deps.useTripAgentContext(...args)
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersion: (...args: unknown[]) => deps.useTripVersion(...args)
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrip: (...args: unknown[]) => deps.useTrip(...args)
}));
vi.mock('@/features/workspace/hooks/use-open-state', () => ({
  useOpenState: () => ({ openPanel: deps.openPanel })
}));
vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => deps.confirm
}));
vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => deps.useOptionalWorkspace()
}));
vi.mock('@/lib/use-ready-value', () => ({
  useReadyValue: (...args: unknown[]) => deps.useReadyValue(...args)
}));

const proposalId = 'proposal-1' as Id<'tripProposals'>;
const sharedTripId = 'shared-trip' as Id<'trips'>;
const workingTripId = 'working-trip' as Id<'trips'>;

beforeEach(() => {
  vi.clearAllMocks();
  deps.useOptionalWorkspace.mockReturnValue({ session: { user: { id: 'user-lea' } } });
  deps.useIdeaContext.mockReturnValue({
    proposal: undefined,
    sharedTrip: { name: 'Shared Portugal' }
  });
  deps.useTrip.mockReturnValue({
    exists: true,
    trip: { departureTransfer: null, id: workingTripId, permissions: { canEdit: true } }
  });
  deps.useReadyValue.mockReturnValue({
    isLoading: false,
    value: { departureTransfer: null, id: workingTripId, permissions: { canEdit: true } }
  });
  deps.useTripVersion.mockReturnValue({
    approve: vi.fn(),
    proposal: {
      author: { userId: 'user-lea' },
      id: proposalId,
      status: 'draft'
    },
    submit: vi.fn()
  });
  deps.useProposalActionRunner.mockReturnValue({ pendingAction: null, run: deps.run });
});

function renderWorkspace(view: 'compare' | 'itinerary' | 'overview' = 'compare') {
  return renderHook(() => useIdeaCloneWorkspace({ proposalId, sharedTripId, view, workingTripId }));
}

test('submits a viewer draft and registers the compare screen as ideas context', () => {
  const { result } = renderWorkspace();

  expect(result.current.primary).toMatchObject({ intent: 'submit' });
  expect(deps.useTripAgentContext).toHaveBeenCalledWith(expect.anything(), 'ideas');
  act(() => {
    result.current.runPrimary();
  });
  expect(deps.run).toHaveBeenCalledWith(
    'submit',
    deps.useTripVersion.mock.results[0]?.value.submit
  );
});

test('preserves route references when changing clone views and allows detail editing', () => {
  const { result } = renderWorkspace('overview');
  act(() => {
    result.current.editDetails();
    result.current.openView('itinerary', true);
  });

  expect(deps.openPanel).toHaveBeenCalled();
  const navigation = deps.navigate.mock.calls[0]?.[0] as {
    params: (current: { proposalId?: Id<'tripProposals'>; tripId?: Id<'trips'> }) => unknown;
    search: unknown;
    to: string;
  };
  expect(navigation).toMatchObject({
    search: { addDestination: true },
    to: '/trips/$tripId/ideas/$proposalId/$view'
  });
  expect(navigation.params({})).toEqual({ proposalId, tripId: sharedTripId, view: 'itinerary' });
});

test('marks a missing working trip as unavailable and keeps the page loading', () => {
  deps.useTrip.mockReturnValue({ exists: false, trip: undefined });
  deps.useReadyValue.mockReturnValue({ isLoading: true, value: undefined });
  const { result } = renderWorkspace('itinerary');

  expect(result.current).toMatchObject({ missing: true, showLoading: true, trip: undefined });
  expect(result.current.planningSection).toBe('itinerary');
});

test('opens an additional destination directly when no return travel exists', async () => {
  const { result } = renderWorkspace('overview');

  await act(async () => {
    result.current.navigation.openAddDestination();
    await Promise.resolve();
  });
  act(() => {
    result.current.navigation.openSection('itinerary');
  });

  expect(deps.confirm).not.toHaveBeenCalled();
  const navigations = deps.navigate.mock.calls.map(([target]) => target) as Array<{
    params: (current: Record<string, unknown>) => Record<string, unknown>;
    search: Record<string, unknown>;
  }>;
  expect(navigations[0]).toMatchObject({ search: { addDestination: true } });
  expect(navigations[1]?.params({})).toMatchObject({ view: 'itinerary' });
});

test('keeps loading while a present trip has not resolved', () => {
  deps.useReadyValue.mockReturnValue({ isLoading: false, value: undefined });

  const { result } = renderWorkspace();

  expect(result.current).toMatchObject({ missing: false, showLoading: true, trip: undefined });
});

test('does not open editing or run a primary action when neither is allowed', () => {
  deps.useTrip.mockReturnValue({
    exists: true,
    trip: { departureTransfer: null, id: workingTripId, permissions: { canEdit: false } }
  });
  deps.useReadyValue.mockReturnValue({
    isLoading: false,
    value: { departureTransfer: null, id: workingTripId, permissions: { canEdit: false } }
  });
  deps.useIdeaContext.mockReturnValue({ proposal: undefined, sharedTrip: undefined });
  deps.useTripVersion.mockReturnValue({ approve: vi.fn(), proposal: undefined, submit: vi.fn() });
  const { result } = renderWorkspace('overview');

  act(() => {
    result.current.editDetails();
    result.current.runPrimary();
  });

  expect(result.current).toMatchObject({ parentLabel: 'Trip', primary: null, showLoading: false });
  expect(deps.openPanel).not.toHaveBeenCalled();
  expect(deps.run).not.toHaveBeenCalled();
  expect(deps.useTripAgentContext).toHaveBeenCalledWith(expect.anything(), 'overview');
});

test('confirms before replacing return travel and handles close and shared navigation', async () => {
  deps.useTrip.mockReturnValue({
    exists: true,
    trip: { departureTransfer: { id: 'return' }, id: workingTripId, permissions: { canEdit: true } }
  });
  deps.useReadyValue.mockReturnValue({
    isLoading: false,
    value: {
      departureTransfer: { id: 'return' },
      id: workingTripId,
      permissions: { canEdit: true }
    }
  });
  deps.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  const { result } = renderWorkspace('itinerary');

  await act(async () => {
    result.current.navigation.openAddDestination();
    await Promise.resolve();
  });
  expect(deps.navigate).not.toHaveBeenCalled();

  await act(async () => {
    result.current.navigation.openAddDestination();
    await Promise.resolve();
  });
  act(() => {
    result.current.navigation.closeAddDestination();
    result.current.openShared();
  });

  expect(deps.confirm).toHaveBeenCalledTimes(2);
  expect(deps.navigate.mock.calls.map(([target]) => target)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ search: { addDestination: true } }),
      expect.objectContaining({ search: {} }),
      {
        params: { section: 'itinerary', tripId: sharedTripId },
        search: {},
        to: '/trips/$tripId/$section'
      }
    ])
  );
});

test('runs approval and opens apply confirmation for review proposals', () => {
  const approve = vi.fn();
  deps.useTripVersion.mockReturnValue({
    approve,
    proposal: {
      author: { userId: 'another-user' },
      canApprove: true,
      hasApproved: false,
      id: proposalId,
      status: 'in_review'
    },
    submit: vi.fn()
  });
  const { result, rerender } = renderWorkspace();

  act(() => {
    result.current.runPrimary();
  });
  expect(deps.run).toHaveBeenCalledWith('approve', expect.any(Function));
  expect(approve).not.toHaveBeenCalled();

  deps.useTripVersion.mockReturnValue({
    approve,
    proposal: {
      author: { userId: 'another-user' },
      canMerge: true,
      id: proposalId,
      status: 'in_review'
    },
    submit: vi.fn()
  });
  rerender();
  act(() => {
    result.current.runPrimary();
  });

  expect(result.current.confirmingApply).toBe(true);
});
