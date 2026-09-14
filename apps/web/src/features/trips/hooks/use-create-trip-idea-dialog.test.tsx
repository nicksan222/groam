import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useCreateTripIdeaDialog } from './use-create-trip-idea-dialog';

describe('useCreateTripIdeaDialog', () => {
  test('opens with optional intent and creates then closes', async () => {
    const createVersion = vi.fn().mockResolvedValue({ proposalId: 'proposal-1' });
    const onCreated = vi.fn();
    const { result } = renderHook(() => useCreateTripIdeaDialog({ createVersion, onCreated }));

    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.isCreating).toBe(false);

    act(() => {
      result.current.openDialog({ addDestination: true, section: 'itinerary' });
    });
    expect(result.current.dialogOpen).toBe(true);

    await act(async () => {
      await result.current.create('Coast');
    });

    expect(createVersion).toHaveBeenCalledWith('Coast');
    expect(onCreated).toHaveBeenCalledWith('proposal-1' as Id<'tripProposals'>, {
      addDestination: true,
      section: 'itinerary'
    });
    expect(result.current.dialogOpen).toBe(false);
    expect(result.current.isCreating).toBe(false);
  });

  test('keeps the dialog open when create returns null', async () => {
    const createVersion = vi.fn().mockResolvedValue(null);
    const onCreated = vi.fn();
    const { result } = renderHook(() => useCreateTripIdeaDialog({ createVersion, onCreated }));

    act(() => {
      result.current.openDialog();
    });
    await act(async () => {
      await result.current.create();
    });

    expect(onCreated).not.toHaveBeenCalled();
    expect(result.current.dialogOpen).toBe(true);
  });

  test('creates directly for a destination intent without opening the naming dialog', async () => {
    const createVersion = vi.fn().mockResolvedValue({ proposalId: 'proposal-2' });
    const onCreated = vi.fn();
    const { result } = renderHook(() => useCreateTripIdeaDialog({ createVersion, onCreated }));

    await act(async () => {
      await result.current.createForIntent({ addDestination: true, section: 'itinerary' });
    });

    expect(createVersion).toHaveBeenCalledWith(undefined);
    expect(onCreated).toHaveBeenCalledWith('proposal-2' as Id<'tripProposals'>, {
      addDestination: true,
      section: 'itinerary'
    });
    expect(result.current.dialogOpen).toBe(false);
  });
});
