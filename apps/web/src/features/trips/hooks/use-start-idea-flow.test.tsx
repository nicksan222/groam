import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { useStartIdeaFlow } from './use-start-idea-flow';
import type { TripDetail } from './use-trips';

const navigate = vi.fn();
const openDialog = vi.fn();
const createForIntent = vi.fn();
const dialog = vi.hoisted(() => ({
  config: undefined as
    | {
        createVersion: (title?: string) => Promise<{ proposalId: Id<'tripProposals'> } | null>;
        onCreated: (proposalId: Id<'tripProposals'>, intent: object) => void;
      }
    | undefined
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate
}));

vi.mock('@/features/workspace/workspace-shell/workspace-state', () => ({
  useOptionalWorkspace: () => ({ session: { user: { id: 'user-lea' } } })
}));

vi.mock('./use-create-trip-idea-dialog', () => ({
  useCreateTripIdeaDialog: (config: NonNullable<typeof dialog.config>) => {
    dialog.config = config;
    return {
      create: vi.fn(),
      createForIntent,
      dialogOpen: false,
      isCreating: false,
      openDialog,
      setDialogOpen: vi.fn()
    };
  }
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
  dialog.config = undefined;
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

test('opens the standard idea dialog with the resolved overview intent', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [],
      trip: trip({ destinations: [{ id: 'd1' }] as TripDetail['destinations'] })
    })
  );

  act(() => result.current.start());

  expect(openDialog).toHaveBeenCalledWith({
    addDestination: false,
    firstDestination: false,
    section: 'overview',
    titleHint: undefined
  });
});

test('navigates directly to an existing draft for the first destination', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [
        {
          author: { userId: 'user-lea' },
          id: 'proposal-1' as Id<'tripProposals'>,
          status: 'draft',
          title: 'Draft'
        }
      ],
      trip: trip()
    })
  );

  act(() => result.current.start({ addDestination: true }));

  expect(navigate).toHaveBeenCalled();
  expect(createForIntent).not.toHaveBeenCalled();
});

test('does nothing when the trip cannot accept proposals', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [],
      trip: trip({ permissions: { ...trip().permissions, canPropose: false } })
    })
  );

  act(() => result.current.start({ addDestination: true }));

  expect(openDialog).not.toHaveBeenCalled();
  expect(createForIntent).not.toHaveBeenCalled();
});

test('creates through the guarded dialog capability and opens the result', async () => {
  const proposalId = 'proposal-new' as Id<'tripProposals'>;
  const createVersion = vi.fn().mockResolvedValue({ proposalId });
  renderHook(() => useStartIdeaFlow({ createVersion, proposals: [], trip: trip() }));

  await expect(dialog.config?.createVersion('Coastal route')).resolves.toEqual({ proposalId });
  act(() => dialog.config?.onCreated(proposalId, { section: 'overview' }));

  expect(createVersion).toHaveBeenCalledWith('Coastal route');
  expect(navigate).toHaveBeenCalled();
});

test('continues or starts another idea from the existing-draft choice', () => {
  const { result } = renderHook(() =>
    useStartIdeaFlow({
      createVersion: vi.fn(),
      proposals: [
        {
          author: { userId: 'user-lea' },
          id: 'proposal-1' as Id<'tripProposals'>,
          status: 'draft',
          title: 'Draft'
        }
      ],
      trip: trip({ destinations: [{ id: 'd1' }] as TripDetail['destinations'] })
    })
  );

  act(() => result.current.start({ titleHint: 'A new path' }));
  act(() => result.current.continueDraft());
  expect(navigate).toHaveBeenCalled();

  act(() => result.current.start({ titleHint: 'Another' }));
  act(() => result.current.startAnotherIdea());
  expect(openDialog).toHaveBeenCalledWith(expect.objectContaining({ titleHint: 'Another' }));
});
