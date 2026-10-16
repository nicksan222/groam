import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
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
  test('opens a new stay and tracks editing boolean', async () => {
    const { result } = await renderHook(() =>
      useTripStayEditor({
        addStay: vi.fn(),
        destination: destination as never,
        updateStay: vi.fn()
      })
    );
    expect(result.current.isEditing).toBe(false);
    await act(() => {
      result.current.open();
    });
    expect(result.current.isEditing).toBe(true);
    expect(result.current.editingId).toBe('new');
  });

  test('saves a new stay and closes on success', async () => {
    const addStay = vi.fn().mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useTripStayEditor({
        addStay,
        destination: destination as never,
        updateStay: vi.fn()
      })
    );

    await act(() => {
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

  test('keeps editing open for invalid and failed saves', async () => {
    const addStay = vi.fn().mockResolvedValue(false);
    const { result } = await renderHook(() =>
      useTripStayEditor({ addStay, destination: destination as never, updateStay: vi.fn() })
    );

    await act(() => result.current.open());
    await act(async () => expect(await result.current.save()).toBe(false));
    expect(addStay).not.toHaveBeenCalled();
    await act(() => result.current.patch({ title: 'Hotel' }));
    await act(async () => expect(await result.current.save()).toBe(false));
    expect(addStay).toHaveBeenCalled();
    expect(result.current.isEditing).toBe(true);
  });

  test('updates an existing stay and appends successful uploads', async () => {
    const updateStay = vi.fn().mockResolvedValue(true);
    media.upload.mockResolvedValue('media-1' as Id<'media'>);
    const stay = {
      checkInDay: 1,
      checkInTime: null,
      checkOutDay: 2,
      checkOutTime: null,
      id: 'stay-1' as Id<'tripDestinationStays'>,
      title: 'Hotel',
      attachments: []
    };
    const { result } = await renderHook(() =>
      useTripStayEditor({ addStay: vi.fn(), destination: destination as never, updateStay })
    );

    await act(() => result.current.open(stay as never));
    await act(async () => expect(await result.current.save()).toBe(true));
    expect(updateStay).toHaveBeenCalledWith(stay.id, expect.anything());

    const files = {
      0: new File(['x'], 'receipt.pdf'),
      length: 1,
      item: () => null
    } as unknown as FileList;
    await act(async () => result.current.uploadFiles(files));
    expect(result.current.draft.attachments).toEqual([{ id: 'media-1', name: 'receipt.pdf' }]);
  });

  test('closes and safely ignores empty upload selections', async () => {
    const { result } = await renderHook(() =>
      useTripStayEditor({
        addStay: vi.fn(),
        destination: destination as never,
        updateStay: vi.fn()
      })
    );
    await act(() => {
      result.current.open();
      result.current.close();
    });
    expect(result.current.isEditing).toBe(false);
    await act(async () => result.current.uploadFiles(null));
    expect(media.upload).not.toHaveBeenCalled();
  });
});
