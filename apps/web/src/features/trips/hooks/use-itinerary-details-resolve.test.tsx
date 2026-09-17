import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ItineraryChange } from './itinerary-proposal-changes';
import { useItineraryDetailsResolve } from './use-itinerary-details-resolve';
import type { TripDetail } from './use-trips';

const convex = vi.hoisted(() => ({ useAction: vi.fn(), useQuery: vi.fn() }));
const notifications = vi.hoisted(() => ({ error: vi.fn() }));
const versions = vi.hoisted(() => ({
  useTripProposalDetail: vi.fn(),
  useTripVersions: vi.fn()
}));
const ideaContext = vi.hoisted(() => ({ useOptionalIdeaContext: vi.fn() }));
const pending = vi.hoisted(() => ({ run: vi.fn() }));
const sheet = vi.hoisted(() => ({ open: false, setOpen: vi.fn() }));

vi.mock('convex/react', () => convex);
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));
vi.mock('@/features/ideas/hooks/use-idea-context', () => ({
  useOptionalIdeaContext: () => ideaContext.useOptionalIdeaContext()
}));
vi.mock('@/features/workspace/hooks/use-async-pending', () => ({
  useAsyncPending: () => ({ isPending: false, run: pending.run })
}));
vi.mock('@/features/workspace/hooks/use-open-state', () => ({
  useOpenState: () => sheet
}));
vi.mock('./use-trip-versions', () => versions);

const tripId = 'trip-1' as Id<'trips'>;
const proposalId = 'proposal-1' as Id<'tripProposals'>;
const change = {
  entity: 'details',
  fields: [{ display: 'value', key: 'name', label: 'Name' }],
  key: 'details.json'
} as ItineraryChange;

function trip(overrides: Partial<TripDetail> = {}) {
  return {
    coverStatus: 'ready',
    currency: 'EUR',
    dateNotes: null,
    destination: { status: 'undecided' },
    destinations: [],
    id: tripId,
    initialBudget: null,
    lastUpdatedAt: 10,
    name: 'Working itinerary',
    proposal: { sourceTripId: 'shared-1' as Id<'trips'> },
    totalDurationDays: null,
    ...overrides
  } as TripDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  ideaContext.useOptionalIdeaContext.mockReturnValue(undefined);
  pending.run.mockImplementation(<T,>(action: () => Promise<T>) => action());
  sheet.open = false;
  const sharedTrip = trip({
    id: 'shared-1' as Id<'trips'>,
    lastUpdatedAt: 5,
    name: 'Shared itinerary'
  });
  convex.useQuery.mockImplementation((_, arguments_) => (arguments_ === 'skip' ? [] : sharedTrip));
  versions.useTripVersions.mockReturnValue({
    proposals: [{ id: proposalId, workingTripId: tripId }]
  });
  versions.useTripProposalDetail.mockReturnValue({
    canRebase: true,
    conflicts: [{ entity: 'details' }],
    id: proposalId,
    title: 'Add a museum day'
  });
});

const attachmentChange = {
  ...change,
  fields: [{ display: 'media', key: 'attachments', label: 'Attachments' }]
} as ItineraryChange;

describe('useItineraryDetailsResolve', () => {
  test('builds choices from loaded data and rebases the selected details', async () => {
    const rebase = vi.fn().mockResolvedValue({ kind: 'applied' });
    convex.useAction.mockReturnValue(rebase);
    const { result } = renderHook(() => useItineraryDetailsResolve({ change, trip: trip() }));

    expect(result.current).toMatchObject({
      canResolve: true,
      dataReady: true,
      fieldKeys: ['name'],
      ideaBranchName: 'Add a museum day',
      sharedBranchName: 'Shared itinerary'
    });
    await act(async () => {
      expect(await result.current.applyChoices({ name: 'mine' })).toBe(true);
    });

    expect(rebase).toHaveBeenCalledWith({
      details: {
        choices: [{ choice: 'mine', key: 'name' }],
        expectedSharedUpdatedAt: 5,
        expectedWorkingUpdatedAt: 10
      },
      proposalId,
      resolutions: []
    });
  });

  test('does not submit incomplete choices and reports remaining rebase conflicts', async () => {
    const rebase = vi.fn().mockResolvedValue({ kind: 'conflicts' });
    convex.useAction.mockReturnValue(rebase);
    const { result } = renderHook(() => useItineraryDetailsResolve({ change, trip: trip() }));

    await act(async () => {
      expect(await result.current.applyChoices({})).toBe(false);
      expect(await result.current.applyChoices({ name: 'shared' })).toBe(false);
    });

    expect(rebase).toHaveBeenCalledTimes(1);
    expect(notifications.error).toHaveBeenCalledWith(
      'Other itinerary conflicts need a decision. Open the comparison to review them together.'
    );
  });

  test('uses the idea context and loads attachment choices only while the sheet is open', async () => {
    const contextualProposal = {
      canRebase: true,
      conflicts: [{ entity: 'details' }, { entity: 'destination' }],
      id: proposalId,
      ideaName: 'Museum day'
    };
    const sharedTrip = trip({ id: 'shared-1' as Id<'trips'>, lastUpdatedAt: 5 });
    const rebase = vi.fn().mockResolvedValue({ kind: 'applied' });
    ideaContext.useOptionalIdeaContext.mockReturnValue({ proposal: contextualProposal });
    sheet.open = true;
    convex.useQuery
      .mockReset()
      .mockReturnValueOnce(sharedTrip)
      .mockReturnValueOnce([{ mediaId: 'shared-file', name: 'Shared file' }])
      .mockReturnValueOnce([{ mediaId: 'mine-file', name: 'My file' }]);
    convex.useAction.mockReturnValue(rebase);

    const { result } = renderHook(() =>
      useItineraryDetailsResolve({ change: attachmentChange, trip: trip() })
    );

    expect(versions.useTripVersions).toHaveBeenCalledWith('shared-1', false);
    expect(versions.useTripProposalDetail).toHaveBeenCalledWith(undefined);
    expect(result.current).toMatchObject({
      ideaBranchName: 'Museum day',
      otherConflicts: 1,
      sharedBranchName: 'Working itinerary'
    });
    expect(result.current.resolveRows[0]).toMatchObject({
      mine: '1 files',
      mineMedia: [{ id: 'mine-file', mediaId: 'mine-file', name: 'My file' }],
      shared: '1 files',
      sharedMedia: [{ id: 'shared-file', mediaId: 'shared-file', name: 'Shared file' }]
    });

    await act(async () => {
      expect(await result.current.applyChoices({ attachments: 'shared' })).toBe(true);
    });
    expect(rebase).toHaveBeenCalledOnce();
  });

  test('keeps resolution disabled while proposal or shared data is unavailable', async () => {
    versions.useTripVersions.mockReturnValue({ proposals: [] });
    versions.useTripProposalDetail.mockReturnValue(undefined);
    convex.useQuery.mockImplementation((_, arguments_) =>
      arguments_ === 'skip' ? undefined : undefined
    );
    convex.useAction.mockReturnValue(vi.fn());
    const { result } = renderHook(() => useItineraryDetailsResolve({ change, trip: trip() }));

    expect(result.current).toMatchObject({
      canResolve: false,
      dataReady: false,
      hasDetailConflicts: false,
      ideaBranchName: 'This idea',
      proposalId: undefined,
      revision: '10:loading',
      sharedBranchName: 'Current group trip'
    });
    await act(async () => {
      expect(await result.current.applyChoices({ name: 'mine' })).toBe(false);
    });
  });

  test('reports rebase errors and treats a cancelled pending action as unresolved', async () => {
    const rebase = vi.fn().mockRejectedValue(new Error('Server Error'));
    convex.useAction.mockReturnValue(rebase);
    const { result, rerender } = renderHook(() =>
      useItineraryDetailsResolve({ change, trip: trip() })
    );

    await act(async () => {
      expect(await result.current.applyChoices({ name: 'mine' })).toBe(false);
    });
    expect(notifications.error).toHaveBeenCalledWith('Unable to apply the selected details');

    pending.run.mockResolvedValueOnce(null);
    rerender();
    await act(async () => {
      expect(await result.current.applyChoices({ name: 'mine' })).toBe(false);
    });
  });
});
