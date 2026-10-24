import type { Id } from '@groam/backend/data-model';
import { create } from 'zustand';
import type { PlannedCalendarActivity } from '@/types/trips';

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type PendingCalendarActivity = PlannedCalendarActivity & {
  /** When its idea opened, so an activity nobody picked up stops applying. */
  createdAt: number;
  /** The idea started for it; only that idea's calendar adds it. */
  proposalId: Id<'tripProposals'>;
};

// oxlint-disable-next-line groam/no-local-type-definitions -- local implementation shape
export type PendingCalendarActivityStore = {
  activity: PendingCalendarActivity | null;
  clear: () => void;
  setActivity: (activity: Omit<PendingCalendarActivity, 'createdAt'>) => void;
};

/** An activity older than this is dropped instead of applied. */
export const PENDING_CALENDAR_ACTIVITY_TTL_MS = 60_000;

/**
 * An activity planned on the shared trip's calendar starts an idea; once that idea exists this
 * carries the activity across the navigation, so the idea's calendar adds it when its copy loads.
 */
export const usePendingCalendarActivityStore = create<PendingCalendarActivityStore>((set) => ({
  activity: null,
  clear: () => set({ activity: null }),
  setActivity: (activity) => set({ activity: { ...activity, createdAt: Date.now() } })
}));
