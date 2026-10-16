import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { EditorTravelTarget, ItineraryEditorProps } from '@/types/itinerary-editor';
import { EditorTravelForm } from './editor-travel-form';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => confirm
}));
vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

function makeTransfer(id: string) {
  return {
    attachments: [],
    costAmount: null,
    costSplit: 'per_person',
    durationMinutes: 90,
    id,
    mode: 'train',
    notes: null,
    timing: null
  };
}

function makeActivity(id: string, title: string, transfer: unknown = null) {
  return {
    dayNumber: 1,
    endDayNumber: 1,
    id,
    title,
    transferToNext: transfer
  };
}

function renderForm(target: EditorTravelTarget, trip: Record<string, unknown> = {}) {
  const actions = {
    removeActivityTransfer: vi.fn().mockResolvedValue(true),
    removeBoundaryTransfer: vi.fn().mockResolvedValue(true),
    removeDestinationTransfer: vi.fn().mockResolvedValue(true),
    setActivityTransfer: vi.fn().mockResolvedValue(true),
    setBoundaryTransfer: vi.fn().mockResolvedValue(true),
    setDestinationTransfer: vi.fn().mockResolvedValue(true)
  };
  const props = {
    activityActions: actions,
    trip: {
      arrivalTransfer: null,
      currency: 'EUR',
      departureTransfer: null,
      destinations: [
        {
          activities: [makeActivity('a1', 'Tile museum'), makeActivity('a2', 'Fado night')],
          endDay: 2,
          id: 'lisbon',
          name: 'Lisbon',
          startDay: 1,
          transferToNext: null
        },
        {
          activities: [],
          endDay: 4,
          id: 'porto',
          name: 'Porto',
          startDay: 3,
          transferToNext: null
        }
      ],
      startDate: null,
      totalDurationDays: 5,
      ...trip
    }
  } as unknown as ItineraryEditorProps;
  const onClose = vi.fn();
  return {
    actions,
    onClose,
    result: render(<EditorTravelForm onClose={onClose} props={props} target={target} />)
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  confirm.mockResolvedValue(true);
});

describe('legs', () => {
  test.each<[string, EditorTravelTarget, string]>([
    ['arrival', { kind: 'arrival' }, 'Trip origin → Lisbon'],
    ['departure', { kind: 'departure' }, 'Porto → Return destination'],
    ['between destinations', { fromId: 'lisbon', kind: 'destination' }, 'Lisbon → Porto'],
    ['between activities', { fromId: 'a1', kind: 'activity' }, 'Tile museum → Fado night']
  ])('labels %s travel', async (_, target, heading) => {
    await renderForm(target).result;
    await expect.element(page.getByRole('region', { name: 'Add travel' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: heading })).toBeVisible();
  });

  test.each<[string, EditorTravelTarget]>([
    ['an unknown destination', { fromId: 'missing', kind: 'destination' }],
    ['the last destination', { fromId: 'porto', kind: 'destination' }],
    ['the last activity', { fromId: 'a2', kind: 'activity' }]
  ])('renders nothing for %s', async (_, target) => {
    await renderForm(target).result;
    await expect.element(page.getByRole('region')).not.toBeInTheDocument();
  });

  test('renders nothing for arrival on a trip without destinations', async () => {
    await renderForm({ kind: 'arrival' }, { destinations: [] }).result;
    await expect.element(page.getByRole('region')).not.toBeInTheDocument();
  });
});

describe('saving', () => {
  test.each<
    [
      string,
      EditorTravelTarget,
      'setBoundaryTransfer' | 'setDestinationTransfer' | 'setActivityTransfer',
      unknown[]
    ]
  >([
    ['arrival', { kind: 'arrival' }, 'setBoundaryTransfer', ['arrival']],
    ['departure', { kind: 'departure' }, 'setBoundaryTransfer', ['departure']],
    [
      'destination',
      { fromId: 'lisbon', kind: 'destination' },
      'setDestinationTransfer',
      ['lisbon', 'porto']
    ],
    ['activity', { fromId: 'a1', kind: 'activity' }, 'setActivityTransfer', ['a1', 'a2']]
  ])(
    'saves %s travel through the matching action and closes',
    async (_, target, action, leading) => {
      const { actions, onClose, result } = renderForm(target);
      await result;
      await page.getByTestId(testIds.travelSave).click();
      await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(actions[action]).toHaveBeenCalledWith(...leading, expect.anything());
    }
  );

  test('stays open when the save is rejected', async () => {
    const { actions, onClose, result } = renderForm({ kind: 'arrival' });
    actions.setBoundaryTransfer.mockResolvedValue(false);
    await result;
    await page.getByTestId(testIds.travelSave).click();
    await vi.waitFor(() => expect(actions.setBoundaryTransfer).toHaveBeenCalled());
    await expect.element(page.getByText(/could not be saved/)).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Cancel closes a pristine form without asking', async () => {
    const { onClose, result } = renderForm({ kind: 'arrival' });
    await result;
    await page.getByRole('button', { name: 'Cancel' }).click();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe('editing existing travel', () => {
  const existing = makeTransfer('t1');

  test('is labelled as an edit and cannot save without changes', async () => {
    await renderForm({ kind: 'arrival' }, { arrivalTransfer: existing }).result;
    await expect.element(page.getByRole('region', { name: 'Edit travel' })).toBeVisible();
    await expect.element(page.getByTestId(testIds.travelSave)).toBeDisabled();
    await expect.element(page.getByText('Everything is saved.')).toBeVisible();
  });

  test.each<[string, EditorTravelTarget, Record<string, unknown>, string]>([
    ['arrival', { kind: 'arrival' }, { arrivalTransfer: existing }, 'removeBoundaryTransfer'],
    ['departure', { kind: 'departure' }, { departureTransfer: existing }, 'removeBoundaryTransfer']
  ])('removes %s travel after confirmation', async (_, target, trip, action) => {
    const { actions, onClose, result } = renderForm(target, trip);
    await result;
    await page.getByRole('button', { name: 'Remove route' }).click();
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(confirm.mock.calls[0][0]).toBe('Remove travel details?');
    expect(actions[action as 'removeBoundaryTransfer']).toHaveBeenCalledWith('t1');
  });

  test('keeps the travel when removal is declined', async () => {
    confirm.mockResolvedValue(false);
    const { actions, onClose, result } = renderForm(
      { kind: 'arrival' },
      { arrivalTransfer: existing }
    );
    await result;
    await page.getByRole('button', { name: 'Remove route' }).click();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(actions.removeBoundaryTransfer).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
