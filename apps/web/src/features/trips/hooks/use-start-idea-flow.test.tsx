import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useStartIdeaFlow } from './use-start-idea-flow';
import type { TripDetail } from './use-trips';

const navigate = vi.fn();
const openDialog = vi.fn();
const createForIntent = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-lea' } } })
}));

vi.mock('./use-create-trip-idea-dialog', () => ({
  useCreateTripIdeaDialog: () => ({
    create: vi.fn(),
    createForIntent,
    dialogOpen: false,
    isCreating: false,
    openDialog,
    setDialogOpen: vi.fn()
  })
}));

const tripId = 'trip-1' as Id<'trips'>;

function trip(overrides: Partial<TripDetail> = {}): TripDetail {
  return {
    destinations: [],
    id: tripId,
    name: 'Atlantic week',
    permissions: {
      canArchive: false,
      canEdit: false,
      canEditCover: false,
      canPropose: true,
      canRestore: false,
      isReadOnly: true
    },
    proposal: null,
    ...overrides
  } as TripDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('opens a choice when the viewer already has a draft', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [
        {
          author: { userId: 'user-lea' },
          id: 'proposal-1' as Id<'tripProposals'>,
          status: 'draft',
          title: 'Add a coast day'
        }
      ],
      trip: trip({ destinations: [{ id: 'd1' }] as TripDetail['destinations'] })
    })
  );

  act(() => {
    result.current.start();
  });

  expect(result.current.existingDraftOpen).toBe(true);
  expect(openDialog).not.toHaveBeenCalled();
});

test('skips the dialog for the empty-route first destination', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [],
      trip: trip()
    })
  );

  act(() => {
    result.current.start({ addDestination: true });
  });

  expect(createForIntent).toHaveBeenCalled();
  expect(openDialog).not.toHaveBeenCalled();
});
