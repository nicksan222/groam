import { renderHook } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { plannerFixture } from '@/features/trips/testing/planner-fixtures';
import { usePendingCalendarActivityStore } from '@/lib/stores/pending-calendar-activity-store';
import type { Destination, TripDetail } from '@/types/trips';
import { usePendingCalendarActivity } from './use-pending-calendar-activity';

const notifications = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn() }));
vi.mock('@groam/ui/components/toast', () => ({ toast: notifications }));
const jumps = vi.hoisted(() => ({ jumpToDay: vi.fn() }));
vi.mock('@/features/trips/trip-destinations/trip-jump-targets', () => jumps);

const addActivity = vi.fn(async () => true);
const input = { schedule: { day: 2, timeBlock: 'morning' as const }, title: 'Tea ceremony' };

/** An idea's working copy of the fixture trip: its stops point back to the shared ones. */
function ideaCopy(canEdit = true): TripDetail {
  const trip = plannerFixture();
  return {
    ...trip,
    destinations: trip.destinations.map((stop) => ({
      ...stop,
      id: `copy-${stop.id}` as Destination['id'],
      sourceId: stop.id
    })),
    permissions: { ...trip.permissions, canEdit }
  } as TripDetail;
}

beforeEach(() => {
  vi.clearAllMocks();
  usePendingCalendarActivityStore.getState().setActivity({
    input,
    proposalId: 'idea-1' as never,
    sourceDestinationId: 'porto' as never
  });
});

test('adds the activity once, to the idea’s copy of the stop it was planned at', async () => {
  const { rerender } = await renderHook(() =>
    usePendingCalendarActivity({ addActivity, proposalId: 'idea-1' as never, trip: ideaCopy() })
  );
  await rerender();
  expect(addActivity).toHaveBeenCalledTimes(1);
  expect(addActivity).toHaveBeenCalledWith('copy-porto', input);
  expect(usePendingCalendarActivityStore.getState().activity).toBeNull();
});

test('waits until the idea it was planned for is open and editable', async () => {
  await renderHook(() =>
    usePendingCalendarActivity({
      addActivity,
      proposalId: 'idea-1' as never,
      trip: ideaCopy(false)
    })
  );
  await renderHook(() =>
    usePendingCalendarActivity({ addActivity, proposalId: 'idea-2' as never, trip: ideaCopy() })
  );
  expect(addActivity).not.toHaveBeenCalled();
  expect(usePendingCalendarActivityStore.getState().activity).not.toBeNull();
});

test('says so and jumps to the day once the activity is added', async () => {
  await renderHook(() =>
    usePendingCalendarActivity({ addActivity, proposalId: 'idea-1' as never, trip: ideaCopy() })
  );
  await vi.waitFor(() =>
    expect(notifications.success).toHaveBeenCalledWith('Added Tea ceremony to this idea')
  );
  expect(jumps.jumpToDay).toHaveBeenCalledWith(2);
});

test('drops an activity whose stop is not in the idea, and says why', async () => {
  const trip = { ...ideaCopy(), destinations: [] };
  await renderHook(() =>
    usePendingCalendarActivity({ addActivity, proposalId: 'idea-1' as never, trip })
  );
  expect(addActivity).not.toHaveBeenCalled();
  expect(notifications).toHaveBeenCalledWith(
    'Tea ceremony couldn’t be added: its stop isn’t in this idea'
  );
  expect(usePendingCalendarActivityStore.getState().activity).toBeNull();
});

test('drops a stale activity without adding it', async () => {
  const pending = usePendingCalendarActivityStore.getState().activity;
  usePendingCalendarActivityStore.setState({ activity: pending && { ...pending, createdAt: 0 } });
  await renderHook(() =>
    usePendingCalendarActivity({ addActivity, proposalId: 'idea-1' as never, trip: ideaCopy() })
  );
  expect(addActivity).not.toHaveBeenCalled();
  expect(usePendingCalendarActivityStore.getState().activity).toBeNull();
});
