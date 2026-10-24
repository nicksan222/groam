import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { Destination, TripActivity, TripActivityActions, TripDetail } from '@/types/trips';
import { EditorActivityForm } from './editor-activity-form';

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

function makeActivity(overrides: Partial<TripActivity> = {}): TripActivity {
  return {
    address: 'Lisbon, Portugal',
    attachments: [],
    costAmount: null,
    costSplit: 'per_person',
    dayNumber: 1,
    endDayNumber: 1,
    endTime: null,
    id: 'museum',
    notes: null,
    sourceId: null,
    startTime: null,
    timeBlock: 'morning',
    title: 'Tile museum',
    transferToNext: null,
    ...overrides
  } as unknown as TripActivity;
}

function makeStop(id: string, name: string, activities: TripActivity[] = []): Destination {
  return {
    activities,
    endDay: 3,
    id,
    name,
    startDay: 1,
    stays: [],
    transferToNext: null
  } as unknown as Destination;
}

const trip = { currency: 'EUR', startDate: null, totalDurationDays: 3 } as unknown as TripDetail;

function makeActions() {
  return {
    addActivity: vi.fn().mockResolvedValue(true),
    removeActivity: vi.fn().mockResolvedValue(true),
    updateActivity: vi.fn().mockResolvedValue(true)
  };
}

function renderForm({
  activity,
  destinations,
  actions = makeActions()
}: {
  activity?: TripActivity;
  actions?: ReturnType<typeof makeActions>;
  destinations?: Destination[];
} = {}) {
  const destination = makeStop('lisbon', 'Lisbon', activity ? [activity] : []);
  const handlers = { onChooseDestination: vi.fn(), onClose: vi.fn(), onUploadingChange: vi.fn() };
  const result = render(
    <EditorActivityForm
      actions={actions as unknown as TripActivityActions}
      destination={destination}
      destinations={destinations ?? [destination]}
      selection={{
        activityId: activity?.id as never,
        day: 2,
        destinationId: 'lisbon' as never,
        period: 'afternoon'
      }}
      trip={trip}
      {...handlers}
    />
  );
  return { actions, handlers, result };
}

beforeEach(() => vi.clearAllMocks());

describe('adding', () => {
  test('is titled for the selected day and destination', async () => {
    await renderForm().result;
    await expect
      .element(page.getByRole('region', { name: 'Add an activity to Day 2' }))
      .toBeVisible();
    await expect.element(page.getByText('Day 2 · Lisbon')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Remove Tile museum' }))
      .not.toBeInTheDocument();
  });

  test('cannot submit until a title is entered', async () => {
    await renderForm().result;
    await expect.element(page.getByRole('button', { name: 'Add to day' })).toBeDisabled();
  });

  test('adds the activity and closes', async () => {
    const { actions, handlers, result } = renderForm();
    await result;
    await page.getByTestId(testIds.activityTitle).fill('Fado night');
    await page.getByRole('button', { name: 'Add to day' }).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(actions.addActivity).toHaveBeenCalledWith(
      'lisbon',
      expect.objectContaining({
        title: 'Fado night',
        schedule: expect.objectContaining({ day: 2 })
      })
    );
  });

  test('stays open when adding fails', async () => {
    const actions = makeActions();
    actions.addActivity.mockResolvedValue(false);
    const { handlers, result } = renderForm({ actions });
    await result;
    await page.getByTestId(testIds.activityTitle).fill('Fado night');
    await page.getByRole('button', { name: 'Add to day' }).click();
    await vi.waitFor(() => expect(actions.addActivity).toHaveBeenCalled());
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  test('Cancel and the close button dismiss without saving', async () => {
    const { actions, handlers, result } = renderForm();
    await result;
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Close activity editor' }).click();
    expect(handlers.onClose).toHaveBeenCalledTimes(2);
    expect(actions.addActivity).not.toHaveBeenCalled();
  });

  test('offers a destination picker only with several destinations', async () => {
    const other = makeStop('porto', 'Porto');
    await renderForm({ destinations: [makeStop('lisbon', 'Lisbon'), other] }).result;
    await expect.element(page.getByLabelText('Destination')).toBeVisible();
    await expect.element(page.getByRole('combobox', { name: 'Destination' })).toBeVisible();
  });

  test('has no destination picker for a single destination', async () => {
    await renderForm().result;
    await expect.element(page.getByLabelText('Destination')).not.toBeInTheDocument();
  });
});

describe('editing', () => {
  test('is titled for the activity and prefilled', async () => {
    await renderForm({ activity: makeActivity() }).result;
    await expect.element(page.getByRole('region', { name: 'Edit Tile museum' })).toBeVisible();
    await expect.element(page.getByTestId(testIds.activityTitle)).toHaveValue('Tile museum');
    await expect.element(page.getByText('Day 2 · Lisbon')).toBeVisible();
    await expect.element(page.getByRole('button', { exact: true, name: 'Save' })).toBeEnabled();
  });

  test('shows the day span of a multi-day activity', async () => {
    await renderForm({ activity: makeActivity({ dayNumber: 1, endDayNumber: 3 }) }).result;
    await expect.element(page.getByText('Days 1–3 · Lisbon')).toBeVisible();
  });

  test('saves changes and closes', async () => {
    const { actions, handlers, result } = renderForm({ activity: makeActivity() });
    await result;
    await page.getByTestId(testIds.activityTitle).fill('Tile museum tour');
    await page.getByRole('button', { exact: true, name: 'Save' }).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(actions.updateActivity).toHaveBeenCalledWith(
      'museum',
      expect.objectContaining({ title: 'Tile museum tour' })
    );
  });

  test('removes the activity only after confirming', async () => {
    const { actions, handlers, result } = renderForm({ activity: makeActivity() });
    await result;
    await page.getByRole('button', { name: 'Remove Tile museum' }).click();
    await expect.element(page.getByText('Remove Tile museum from this idea?')).toBeVisible();
    expect(actions.removeActivity).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Remove plan' }).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(actions.removeActivity).toHaveBeenCalledWith('museum');
  });

  test('keeping the plan dismisses the confirmation', async () => {
    const { actions, result } = renderForm({ activity: makeActivity() });
    await result;
    await page.getByRole('button', { name: 'Remove Tile museum' }).click();
    await page.getByRole('button', { name: 'Keep plan' }).click();
    await expect.element(page.getByRole('button', { name: 'Remove plan' })).not.toBeInTheDocument();
    expect(actions.removeActivity).not.toHaveBeenCalled();
  });
});
