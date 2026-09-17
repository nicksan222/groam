import type { Id } from '@groam/backend/data-model';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useTripTransferForm } from './use-trip-transfer-form';

const mediaId = (value: string) => value as Id<'media'>;

function options(
  overrides: Partial<Parameters<typeof useTripTransferForm>[0]> = {}
): Parameters<typeof useTripTransferForm>[0] {
  return {
    initial: null,
    kind: 'activity',
    minimumDay: 1,
    onRemove: vi.fn().mockResolvedValue(true),
    onSave: vi.fn().mockResolvedValue(true),
    uploadMedia: vi.fn().mockResolvedValue(mediaId('media-new')),
    ...overrides
  };
}

beforeEach(() => vi.clearAllMocks());

describe('useTripTransferForm', () => {
  test('creates a normalized, typed activity transfer draft', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useTripTransferForm(options({ onSave })));

    expect(result.current.mode).toBe('walk');
    expect(result.current.canSave).toBe(true);
    act(() => {
      result.current.setMode('public_transit');
      result.current.setDuration('35');
      result.current.setTiming({
        endDay: 1,
        endTime: '09:10',
        startDay: 1,
        startTime: '08:35'
      });
      result.current.setNotes('  Meet outside the north entrance  ');
    });

    await act(() => result.current.save());

    expect(onSave).toHaveBeenCalledWith({
      attachmentIds: [],
      duration: { minutes: 35 },
      mode: 'public_transit',
      notes: 'Meet outside the north entrance',
      timing: {
        endTime: '09:10',
        startDay: 1,
        startTime: '08:35'
      }
    });
    expect(result.current.isBusy).toBe(false);
  });

  test('explains every invalid duration and preserves a failed draft', async () => {
    const onSave = vi.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useTripTransferForm(options({ onSave })));

    act(() => result.current.setDuration('1.5'));
    expect(result.current.durationError).toBe('Use a whole number of minutes.');
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setDuration('0'));
    expect(result.current.durationError).toBe('Duration must be at least 1 minute.');
    act(() => result.current.setDuration('10081'));
    expect(result.current.durationError).toBe('Duration cannot exceed 7 days.');
    act(() => result.current.setDuration('45'));

    await act(() => result.current.save());

    expect(result.current.duration).toBe('45');
    expect(result.current.status).toEqual({
      kind: 'error',
      message: 'Travel details could not be saved. Your draft is still here.'
    });
  });

  test('detects unchanged edits and enables save only after a meaningful change', () => {
    const initial = {
      attachments: [{ id: mediaId('media-1'), name: 'ticket.pdf' }],
      durationMinutes: 90,
      mode: 'train' as const,
      notes: 'Carriage 4',
      timing: null
    };
    const { result } = renderHook(() =>
      useTripTransferForm(options({ initial, kind: 'destination' }))
    );

    expect(result.current.hasChanges).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.mode).toBe('train');
    act(() => result.current.setNotes('Carriage 5'));
    expect(result.current.hasChanges).toBe(true);
    expect(result.current.canSave).toBe(true);
    act(() => result.current.removeAttachment(mediaId('media-1')));
    expect(result.current.attachments).toEqual([]);
  });

  test('treats exact timing as an explicit optional section', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const initial = {
      attachments: [],
      durationMinutes: null,
      mode: 'train' as const,
      notes: null,
      timing: {
        endDay: 2,
        endTime: '09:10',
        startDay: 1,
        startTime: '08:35'
      }
    };
    const { result } = renderHook(() =>
      useTripTransferForm(options({ initial, kind: 'destination', onSave }))
    );

    expect(result.current.timingEnabled).toBe(true);
    act(() => result.current.setExactTiming(false));
    expect(result.current.hasChanges).toBe(true);
    await act(() => result.current.save());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ timing: undefined }));
  });

  test('fills only available attachment slots and reports omitted files', async () => {
    const uploadMedia = vi.fn().mockResolvedValue(mediaId('media-5'));
    const initial = {
      attachments: [1, 2, 3, 4].map((value) => ({
        id: mediaId(`media-${value}`),
        name: `${value}.pdf`
      })),
      durationMinutes: null,
      mode: 'flight' as const,
      notes: null,
      timing: null
    };
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      new File(['c'], 'c.pdf', { type: 'application/pdf' })
    ];
    const { result } = renderHook(() =>
      useTripTransferForm(options({ initial, kind: 'destination', uploadMedia }))
    );

    await act(() => result.current.uploadFiles(files));

    expect(uploadMedia).toHaveBeenCalledTimes(1);
    expect(result.current.attachments).toHaveLength(5);
    expect(result.current.status).toEqual({
      kind: 'warning',
      message: '2 files exceeded the 5-file limit.'
    });
  });

  test('keeps successful uploads while reporting partial failures and thrown uploads', async () => {
    const uploadMedia = vi
      .fn()
      .mockResolvedValueOnce(mediaId('media-good'))
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('network'));
    const files = [
      new File(['a'], 'good.pdf', { type: 'application/pdf' }),
      new File(['b'], 'invalid.exe'),
      new File(['c'], 'offline.pdf', { type: 'application/pdf' })
    ];
    const { result } = renderHook(() => useTripTransferForm(options({ uploadMedia })));

    await act(() => result.current.uploadFiles(files));

    expect(result.current.attachments).toEqual([{ id: mediaId('media-good'), name: 'good.pdf' }]);
    expect(result.current.status).toEqual({
      kind: 'warning',
      message: '2 files could not be uploaded.'
    });
    expect(result.current.isUploading).toBe(false);
  });

  test('reports failed removal and safely ignores removal for a new transfer', async () => {
    const onRemove = vi.fn().mockRejectedValue(new Error('offline'));
    const initial = {
      attachments: [],
      durationMinutes: null,
      mode: 'car' as const,
      notes: null,
      timing: null
    };
    const existing = renderHook(() => useTripTransferForm(options({ initial, onRemove })));

    await act(() => existing.result.current.remove());
    expect(existing.result.current.status).toEqual({
      kind: 'error',
      message: 'The travel connection could not be removed.'
    });

    const fresh = renderHook(() => useTripTransferForm(options({ onRemove })));
    await act(() => fresh.result.current.remove());
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('preserves an existing transfer when removal is declined', async () => {
    const onRemove = vi.fn().mockResolvedValue(false);
    const initial = {
      attachments: [],
      durationMinutes: null,
      mode: 'train' as const,
      notes: null,
      timing: null
    };
    const { result } = renderHook(() => useTripTransferForm(options({ initial, onRemove })));

    await act(() => result.current.remove());

    expect(result.current.status).toEqual({
      kind: 'error',
      message: 'The travel connection could not be removed.'
    });
    expect(result.current.isPending).toBe(false);
  });

  test('reports thrown saves and a full attachment list', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('offline'));
    const initial = {
      attachments: [1, 2, 3, 4, 5].map((value) => ({
        id: mediaId(`media-${value}`),
        name: `${value}.pdf`
      })),
      durationMinutes: null,
      mode: 'train' as const,
      notes: null,
      timing: null
    };
    const { result } = renderHook(() =>
      useTripTransferForm(options({ initial, kind: 'destination', onSave }))
    );

    act(() => result.current.setNotes('Delayed'));
    await act(() => result.current.save());
    expect(result.current.status).toEqual({
      kind: 'error',
      message: 'Travel details could not be saved. Your draft is still here.'
    });
    await act(() => result.current.uploadFiles([new File(['x'], 'extra.pdf')]));
    expect(result.current.status).toEqual({
      kind: 'warning',
      message: 'Remove a file before uploading another.'
    });
  });
});
