import { api } from '@groam/backend/api';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { useCommandPalette } from './use-command-palette';

const chrome = vi.hoisted(() => ({
  closeAndClear: vi.fn(),
  onOpenChange: vi.fn(),
  open: false,
  query: '',
  setQuery: vi.fn(),
  toggle: vi.fn()
}));
const data = vi.hoisted(() => ({
  current: {
    isLoading: false,
    onTripRoute: true,
    reference: 'kyoto1' as string | null,
    trip: null as unknown
  },
  discussions: [] as unknown[],
  issues: [] as unknown[],
  params: {} as Record<string, string>,
  proposals: [] as unknown[],
  trips: [] as unknown[]
}));
const navigate = vi.hoisted(() => vi.fn());
const hooks = vi.hoisted(() => ({
  discussions: vi.fn(),
  issues: vi.fn(),
  query: vi.fn(),
  trips: vi.fn(),
  versions: vi.fn()
}));

const sharedTrip = { canParticipate: true, id: 'trip-1', proposal: null, shortId: 'kyoto1' };

vi.mock('@/lib/navigation/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/router')>()),
  useNavigate: () => navigate,
  useParams: () => data.params
}));
vi.mock('convex/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('convex/react')>()),
  useQuery: (...args: unknown[]) => hooks.query(...args)
}));
vi.mock('@/features/trips/hooks/use-current-trip', () => ({ useCurrentTrip: () => data.current }));
vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: (...args: unknown[]) => hooks.discussions(...args)
}));
vi.mock('@/features/trips/hooks/use-trip-issues', () => ({
  useTripIssues: (...args: unknown[]) => hooks.issues(...args)
}));
vi.mock('@/features/trips/hooks/use-trip-versions', () => ({
  useTripVersions: (...args: unknown[]) => hooks.versions(...args)
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (...args: unknown[]) => hooks.trips(...args)
}));
vi.mock('./command-palette-chrome', () => ({ useCommandPaletteChrome: () => chrome }));

beforeEach(() => {
  vi.clearAllMocks();
  chrome.open = false;
  chrome.query = '';
  data.current = { isLoading: false, onTripRoute: true, reference: 'kyoto1', trip: sharedTrip };
  data.discussions = [];
  data.issues = [];
  data.params = { section: 'packing', tripId: 'kyoto1' };
  data.proposals = [];
  data.trips = [];
  hooks.discussions.mockImplementation(() => ({ discussions: data.discussions }));
  hooks.issues.mockImplementation(() => ({ issues: data.issues }));
  hooks.versions.mockImplementation(() => ({ proposals: data.proposals }));
  hooks.trips.mockImplementation(() => ({ trips: data.trips }));
});

describe('useCommandPalette', () => {
  test('keeps every search skipped until opened and toggles with the keyboard shortcut', async () => {
    const { unmount } = await renderHook(() => useCommandPalette());
    expect(hooks.trips).toHaveBeenCalledWith('skip');
    expect(hooks.discussions).toHaveBeenCalledWith('skip');
    expect(hooks.versions).toHaveBeenCalledWith(undefined, false);
    expect(hooks.issues).toHaveBeenCalledWith(undefined, false);

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(chrome.toggle).toHaveBeenCalledOnce();
    await unmount();
  });

  test("subscribes to the current trip's ideas and issues once open", async () => {
    chrome.open = true;
    await renderHook(() => useCommandPalette());
    expect(hooks.versions).toHaveBeenCalledWith('trip-1', true);
    expect(hooks.issues).toHaveBeenCalledWith('trip-1', true);
    expect(hooks.trips).toHaveBeenCalledWith({ includeArchived: false, initialNumItems: 25 });
  });

  test('skips the per-trip queries when there is no shared trip', async () => {
    chrome.open = true;
    data.current = { isLoading: false, onTripRoute: false, reference: null, trip: null };
    await renderHook(() => useCommandPalette());
    expect(hooks.versions).toHaveBeenLastCalledWith(undefined, true);
    expect(hooks.issues).toHaveBeenLastCalledWith(undefined, true);
  });

  test('skips them for a trip the viewer cannot take part in', async () => {
    chrome.open = true;
    data.current = {
      ...data.current,
      trip: { ...sharedTrip, canParticipate: false }
    };
    await renderHook(() => useCommandPalette());
    expect(hooks.versions).toHaveBeenLastCalledWith(undefined, true);
  });

  test('never reads the agent roster', async () => {
    chrome.open = true;
    await renderHook(() => useCommandPalette());
    const queries = hooks.query.mock.calls.map(([reference]) => reference);
    expect(queries).not.toContain(api.routes.agents.get.run);
  });

  test("browses sections first, then this trip's issues and ideas, then the other trips", async () => {
    chrome.open = true;
    data.issues = [{ id: 'is1', title: 'Visa rules' }];
    data.proposals = [
      { author: { userId: 'u1' }, id: 'i1', status: 'in_review', title: 'Coast day' }
    ];
    data.trips = [{ id: 'trip-2', name: 'Lisbon', shortId: 'lis2' }];
    const { result } = await renderHook(() => useCommandPalette());
    expect(result.current.results.map((item) => item.group)).toEqual([
      ...Array.from({ length: 9 }, () => 'Go to'),
      'Ideas',
      'Issues',
      'Switch to'
    ]);
    expect(result.current.results.find((item) => item.id === 'idea:i1')?.href).toMatchObject({
      params: { proposalId: 'i1', tripId: 'trip-1' }
    });
  });

  test("hides other travelers' draft ideas", async () => {
    chrome.open = true;
    data.proposals = [
      { author: { userId: 'someone' }, id: 'i1', status: 'draft', title: 'Secret draft' }
    ];
    const { result } = await renderHook(() => useCommandPalette());
    expect(result.current.results.map((item) => item.id)).not.toContain('idea:i1');
  });

  test('choosing a trip keeps the section', async () => {
    chrome.open = true;
    data.trips = [{ id: 'trip-2', name: 'Lisbon', shortId: 'lis2' }];
    const { result } = await renderHook(() => useCommandPalette());
    const target = result.current.results.find((item) => item.id === 'trip:trip-2')!;
    await act(() => result.current.go(target));
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'packing', tripId: 'lis2' },
      to: '/trips/$tripId/$section'
    });
  });

  test('an idea working copy stands for its shared trip', async () => {
    chrome.open = true;
    // `useCurrentTrip` resolves a working copy to the shared trip it edits.
    data.params = { proposalId: 'p1', tripId: 'working-copy-1', view: 'overview' };
    data.trips = [{ id: 'trip-2', name: 'Lisbon', shortId: 'lis2' }];
    const { result } = await renderHook(() => useCommandPalette());
    expect(hooks.versions).toHaveBeenCalledWith('trip-1', true);
    const sections = result.current.results.filter((item) => item.group === 'Go to');
    expect(sections[0]?.href).toMatchObject({ params: { tripId: 'kyoto1' } });
    const target = result.current.results.find((item) => item.id === 'trip:trip-2')!;
    expect(target.href).toMatchObject({ params: { section: 'ideas', tripId: 'lis2' } });
  });

  test("this trip's chats come first", async () => {
    chrome.open = true;
    data.discussions = [
      { id: 'd1', title: 'Airport', tripId: 'trip-other' },
      { id: 'd2', title: 'Zoo plans', tripId: 'trip-1' }
    ];
    const { result } = await renderHook(() => useCommandPalette());
    expect(
      result.current.results.filter((item) => item.group === 'Chats').map((item) => item.id)
    ).toEqual(['chat:d2', 'chat:d1']);
  });

  test('off a trip there is no Go to group', async () => {
    chrome.open = true;
    data.current = { isLoading: false, onTripRoute: false, reference: null, trip: null };
    data.params = {};
    data.trips = [{ id: 'trip-2', name: 'Lisbon', shortId: 'lis2' }];
    const { result } = await renderHook(() => useCommandPalette());
    expect(result.current.results.map((item) => item.group)).toEqual(['Trips']);
  });

  test('only trips load more', async () => {
    chrome.open = true;
    const loadMore = vi.fn();
    hooks.trips.mockReturnValue({ loadMore, status: 'CanLoadMore', trips: [] });
    const { result } = await renderHook(() => useCommandPalette());
    expect(result.current.canLoadMore).toBe(true);
    await act(() => result.current.loadMore());
    expect(loadMore).toHaveBeenCalledExactlyOnceWith(25);
  });

  test('navigates after closing', async () => {
    chrome.open = true;
    chrome.query = 'plan';
    const { result } = await renderHook(() => useCommandPalette());
    await act(() => result.current.go(result.current.results[0]!));
    expect(chrome.closeAndClear).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith({
      params: { section: 'plan', tripId: 'kyoto1' },
      to: '/trips/$tripId/$section'
    });
  });
});
