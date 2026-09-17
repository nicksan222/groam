import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
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
  agents: [] as unknown[],
  discussions: [] as unknown[],
  issues: [] as unknown[],
  proposals: [] as unknown[],
  trips: [] as unknown[]
}));
const navigate = vi.hoisted(() => vi.fn());
const hooks = vi.hoisted(() => ({
  agents: vi.fn(),
  discussions: vi.fn(),
  ideas: vi.fn(),
  issues: vi.fn(),
  trips: vi.fn()
}));

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }));
vi.mock('@/features/agents/hooks/use-agent-roster', () => ({
  useAgentRoster: (...args: unknown[]) => hooks.agents(...args)
}));
vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useDiscussions: (...args: unknown[]) => hooks.discussions(...args)
}));
vi.mock('@/features/ideas/hooks/use-workspace-ideas', () => ({
  useWorkspaceIdeas: (...args: unknown[]) => hooks.ideas(...args)
}));
vi.mock('@/features/issues/hooks/use-workspace-issues', () => ({
  useWorkspaceIssues: (...args: unknown[]) => hooks.issues(...args)
}));
vi.mock('@/features/trips/hooks/use-trips', () => ({
  useTrips: (...args: unknown[]) => hooks.trips(...args)
}));
vi.mock('./command-palette-chrome', () => ({ useCommandPaletteChrome: () => chrome }));

beforeEach(() => {
  vi.clearAllMocks();
  chrome.open = false;
  chrome.query = '';
  data.agents = [];
  data.discussions = [];
  data.issues = [];
  data.proposals = [];
  data.trips = [];
  hooks.agents.mockImplementation(() => ({ agents: data.agents }));
  hooks.discussions.mockImplementation(() => ({ discussions: data.discussions }));
  hooks.ideas.mockImplementation(() => ({ proposals: data.proposals }));
  hooks.issues.mockImplementation(() => ({ issues: data.issues }));
  hooks.trips.mockImplementation(() => ({ trips: data.trips }));
});

describe('useCommandPalette', () => {
  test('keeps searches skipped until opened and toggles with the keyboard shortcut', () => {
    const { unmount } = renderHook(() => useCommandPalette());
    expect(hooks.trips).toHaveBeenCalledWith('skip');
    expect(hooks.discussions).toHaveBeenCalledWith('skip');

    const event = new KeyboardEvent('keydown', { ctrlKey: true, key: 'k', cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(chrome.toggle).toHaveBeenCalledOnce();
    unmount();
  });

  test('builds results from loaded data and navigates after closing', () => {
    chrome.open = true;
    chrome.query = 'paris';
    data.trips = [{ id: 'trip-1', name: 'Paris escape' }];
    const { result } = renderHook(() => useCommandPalette());

    expect(hooks.trips).toHaveBeenCalledWith({ includeArchived: false, initialNumItems: 25 });
    expect(result.current.results[0]).toMatchObject({ id: 'trip:trip-1', kind: 'Trip' });
    act(() => result.current.go(result.current.results[0]!));
    expect(chrome.closeAndClear).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(result.current.results[0]?.href);
  });
});
