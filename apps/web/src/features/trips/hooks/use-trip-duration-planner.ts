import { stringFromDate } from '@groam/ui/lib/calendar-date';
import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import { addTripDays, tripDurationRangeState } from '@/features/trips/trip-duration';
import { useAsyncPendingState } from '@/lib/stores/async-request-store';
import { createTripDurationPlannerStore } from '@/lib/stores/trip-duration-planner-store';

export function useTripDurationPlanner({
  minimumDays,
  onSave,
  startDate,
  totalDays
}: {
  minimumDays: number;
  onSave: (days: number, startDate: string | undefined) => Promise<boolean>;
  startDate: null | string;
  totalDays: number | null;
}) {
  const minimum = Math.max(1, minimumDays);
  const initialDays = totalDays ?? Math.max(7, minimum);
  const [store] = useState(() =>
    createTripDurationPlannerStore(
      startDate ?? '',
      startDate ? addTripDays(startDate, initialDays - 1) : ''
    )
  );
  const from = useStore(store, (state) => state.from);
  const to = useStore(store, (state) => state.to);
  const openField = useStore(store, (state) => state.openField);
  const setField = useStore(store, (state) => state.setField);
  const setRange = useStore(store, (state) => state.setRange);
  const pending = useAsyncPendingState();
  const { days, hasChanged, isValid } = tripDurationRangeState({
    from,
    minimumDays: minimum,
    startDate,
    to,
    totalDays
  });

  const selectRange = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      const nextFrom = range?.from ? stringFromDate(range.from) : '';
      const nextTo = range?.to ? stringFromDate(range.to) : '';
      setRange(nextFrom, nextTo);
      if (range?.from && range.to && stringFromDate(range.from) !== stringFromDate(range.to)) {
        setField(null);
      }
    },
    [setField, setRange]
  );

  const save = useCallback(async () => {
    if (!hasChanged) return false;
    return (await pending.run(() => onSave(days, from))) ?? false;
  }, [days, from, hasChanged, onSave, pending]);

  return {
    days,
    from,
    hasChanged,
    isPending: pending.isPending,
    isValid,
    minimum,
    openField,
    save,
    selectRange,
    setOpenField: setField,
    to
  };
}
