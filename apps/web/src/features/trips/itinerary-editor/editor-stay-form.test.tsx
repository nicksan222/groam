import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ItineraryEditorProps } from '@/types/itinerary-editor';
import type { Destination } from '@/types/trips';
import { EditorStayForm } from './editor-stay-form';

const confirm = vi.hoisted(() => vi.fn());
vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => confirm
}));
vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => vi.fn()
}));

const hotel = {
  address: null,
  attachments: [],
  checkInDay: 1,
  checkInTime: null,
  checkOutDay: 2,
  checkOutTime: null,
  costAmount: null,
  costSplit: 'per_person',
  id: 'hotel',
  notes: null,
  title: 'Hotel Baixa'
};

function makeStop(id: string, name: string, stays: unknown[] = []): Destination {
  return {
    activities: [],
    endDay: 3,
    id,
    name,
    startDay: 1,
    stays,
    transferToNext: null
  } as unknown as Destination;
}

function renderForm({
  destinations,
  stayId
}: { destinations?: Destination[]; stayId?: string } = {}) {
  const destination = makeStop('lisbon', 'Lisbon', [hotel]);
  const stayActions = {
    addStay: vi.fn().mockResolvedValue(true),
    removeStay: vi.fn().mockResolvedValue(true),
    updateStay: vi.fn().mockResolvedValue(true)
  };
  const handlers = { onChooseDestination: vi.fn(), onClose: vi.fn() };
  const props = {
    stayActions,
    trip: { currency: 'EUR', startDate: null }
  } as unknown as ItineraryEditorProps;
  const result = render(
    <EditorStayForm
      day={2}
      destination={destination}
      destinations={destinations ?? [destination]}
      props={props}
      stayId={stayId as never}
      {...handlers}
    />
  );
  return { handlers, result, stayActions };
}

beforeEach(() => {
  vi.clearAllMocks();
  confirm.mockResolvedValue(true);
});

describe('adding a stay', () => {
  test('is labelled and prefills the check-in day', async () => {
    await renderForm().result;
    await expect.element(page.getByRole('region', { name: 'Add stay' })).toBeVisible();
    await expect.element(page.getByText('Your place in Lisbon')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Remove stay' })).not.toBeInTheDocument();
  });

  test('cannot save without a name', async () => {
    await renderForm().result;
    await expect.element(page.getByTestId(testIds.staySave)).toBeDisabled();
  });

  test('adds the stay and closes', async () => {
    const { handlers, result, stayActions } = renderForm();
    await result;
    await page.getByTestId(testIds.stayName).fill('Casa do Rio');
    await page.getByTestId(testIds.staySave).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(stayActions.addStay).toHaveBeenCalledWith(
      'lisbon',
      expect.objectContaining({ title: 'Casa do Rio' })
    );
  });

  test('stays open when the save fails', async () => {
    const { handlers, result, stayActions } = renderForm();
    stayActions.addStay.mockResolvedValue(false);
    await result;
    await page.getByTestId(testIds.stayName).fill('Casa do Rio');
    await page.getByTestId(testIds.staySave).click();
    await vi.waitFor(() => expect(stayActions.addStay).toHaveBeenCalled());
    expect(handlers.onClose).not.toHaveBeenCalled();
  });

  test('Cancel dismisses without saving', async () => {
    const { handlers, result, stayActions } = renderForm();
    await result;
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(stayActions.addStay).not.toHaveBeenCalled();
  });

  test('offers a destination picker with several destinations', async () => {
    await renderForm({
      destinations: [makeStop('lisbon', 'Lisbon'), makeStop('porto', 'Porto')]
    }).result;
    await expect.element(page.getByText('Destination')).toBeVisible();
  });

  test('has no picker with a single destination', async () => {
    await renderForm().result;
    await expect.element(page.getByText('Destination')).not.toBeInTheDocument();
  });
});

describe('editing a stay', () => {
  test('loads the stay and hides the destination picker', async () => {
    await renderForm({
      destinations: [makeStop('lisbon', 'Lisbon'), makeStop('porto', 'Porto')],
      stayId: 'hotel'
    }).result;
    await expect.element(page.getByRole('region', { name: 'Edit stay' })).toBeVisible();
    await expect.element(page.getByTestId(testIds.stayName)).toHaveValue('Hotel Baixa');
    await expect.element(page.getByText('Destination')).not.toBeInTheDocument();
  });

  test('updates the stay', async () => {
    const { handlers, result, stayActions } = renderForm({ stayId: 'hotel' });
    await result;
    await page.getByTestId(testIds.stayName).fill('Hotel Baixa Deluxe');
    await page.getByTestId(testIds.staySave).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(stayActions.updateStay).toHaveBeenCalledWith(
      'hotel',
      expect.objectContaining({ title: 'Hotel Baixa Deluxe' })
    );
  });

  test('removes the stay after confirmation', async () => {
    const { handlers, result, stayActions } = renderForm({ stayId: 'hotel' });
    await result;
    await page.getByRole('button', { name: 'Remove stay' }).click();
    await vi.waitFor(() => expect(handlers.onClose).toHaveBeenCalledTimes(1));
    expect(confirm.mock.calls[0][0]).toBe('Remove Hotel Baixa?');
    expect(stayActions.removeStay).toHaveBeenCalledWith('hotel');
  });

  test('keeps the stay when removal is declined', async () => {
    confirm.mockResolvedValue(false);
    const { handlers, result, stayActions } = renderForm({ stayId: 'hotel' });
    await result;
    await page.getByRole('button', { name: 'Remove stay' }).click();
    await vi.waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(stayActions.removeStay).not.toHaveBeenCalled();
    expect(handlers.onClose).not.toHaveBeenCalled();
  });
});
