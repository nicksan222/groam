import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripStayEditor } from './use-trip-stay-editor';

const media = vi.hoisted(() => ({
  upload: vi.fn()
}));

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => media.upload
}));

const destination = {
  endDay: 3,
  id: 'dest-1' as Id<'tripDestinations'>,
  startDay: 1,
  stays: []
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTripStayEditor', () => {
  test('opens a new stay and tracks editing boolean', () => {
    const { result } = renderHook(() =>
      useTripStayEditor({
        addStay: vi.fn(),
        destination: destination as never,
        updateStay: vi.fn()
      })
    );
    expect(result.current.isEditing).toBe(false);
    act(() => {
      result.current.open();
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editingId).toBe('new');
  });

  test('saves a new stay and closes on success', async () => {
    const addStay = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useTripStayEditor({
        addStay,
        destination: destination as never,
        updateStay: vi.fn()
      })
    );

    act(() => {
      result.current.open();
      result.current.patch({ title: 'Hotel' });
    });

    await act(async () => {
      await result.current.save();
    });
    expect(addStay).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isPending).toBe(false);
  });
});
