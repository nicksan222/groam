import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useStartIdeaDialog } from './use-start-idea-dialog';

const deps = vi.hoisted(() => ({
  createIdea: vi.fn(),
  navigate: vi.fn()
}));

vi.mock('./use-workspace-ideas', () => ({
  useCreateIdea: () => deps.createIdea
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => deps.navigate
}));

beforeEach(() => {
  vi.clearAllMocks();
  deps.createIdea.mockResolvedValue({ proposalId: 'proposal-1' });
});

describe('useStartIdeaDialog', () => {
  test('tracks dialog and trip selection booleans', () => {
    const { result } = renderHook(() => useStartIdeaDialog());
    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.isCreating).toBe(false);

    act(() => {
      result.current.openDialog();
      result.current.setSelectedTripId('trip-1' as Id<'trips'>);
    });
    expect(result.current.dialogOpen).toBe(true);
    expect(result.current.selectedTripId).toBe('trip-1');

    act(() => {
      result.current.onOpenChange(false);
    });
    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.selectedTripId).toBe('');
  });

  test('starts an idea and navigates on success', async () => {
    const { result } = renderHook(() => useStartIdeaDialog());
    act(() => {
      result.current.setSelectedTripId('trip-1' as Id<'trips'>);
      result.current.openDialog();
    });

    await act(async () => {
      await result.current.startIdea('Coast');
    });

    expect(deps.createIdea).toHaveBeenCalledWith('trip-1', 'Coast');
    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.isCreating).toBe(false);
    expect(deps.navigate).toHaveBeenCalled();
  });

  test('no-ops when no trip is selected', async () => {
    const { result } = renderHook(() => useStartIdeaDialog());
    await act(async () => {
      await result.current.startIdea();
    });
    expect(deps.createIdea).not.toHaveBeenCalled();
  });

  test('stops creating without navigation when the idea service returns no version', async () => {
    deps.createIdea.mockResolvedValue(null);
    const { result } = renderHook(() => useStartIdeaDialog());
    act(() => result.current.setSelectedTripId('trip-1' as Id<'trips'>));
    await act(() => result.current.startIdea());
    expect(result.current.isCreating).toBe(false);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});
