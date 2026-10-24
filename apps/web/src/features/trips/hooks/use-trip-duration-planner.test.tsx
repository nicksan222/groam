import { act, renderHook } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { useTripDurationPlanner } from './use-trip-duration-planner';

describe('useTripDurationPlanner', () => {
  test('tracks validity and skips save when unchanged', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useTripDurationPlanner({
        minimumDays: 2,
        onSave,
        startDate: '2026-06-01',
        totalDays: 3
      })
    );

    expect(result.current.from).toBe('2026-06-01');
    expect(result.current.to).toBe('2026-06-03');
    expect(result.current.isValid).toBe(true);
    expect(result.current.hasChanged).toBe(false);

    await act(async () => {
      await result.current.save();
    });
    expect(onSave).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);
  });

  test('saves when the range changes and closes the field after a full range', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useTripDurationPlanner({
        minimumDays: 2,
        onSave,
        startDate: null,
        totalDays: null
      })
    );

    await act(() => {
      result.current.setOpenField('start');
      result.current.selectRange({
        from: new Date('2026-07-01T00:00:00'),
        to: new Date('2026-07-05T00:00:00')
      });
    });
    expect(result.current.openField).toBeNull();
    expect(result.current.hasChanged).toBe(true);

    await act(async () => {
      await result.current.save();
    });
    expect(onSave).toHaveBeenCalled();
  });

  test('the form submit saves a changed range', async () => {
    const onSave = vi.fn().mockResolvedValue(true);
    const { result } = await renderHook(() =>
      useTripDurationPlanner({ minimumDays: 2, onSave, startDate: null, totalDays: null })
    );

    await act(() =>
      result.current.selectRange({ from: new Date(2026, 5, 1), to: new Date(2026, 5, 4) })
    );
    await act(() => result.current.handleSubmit({ preventDefault: () => {} } as never));
    await expect.poll(() => onSave.mock.calls.length).toBe(1);
    expect(onSave).toHaveBeenCalledWith(4, '2026-06-01');
  });
});
