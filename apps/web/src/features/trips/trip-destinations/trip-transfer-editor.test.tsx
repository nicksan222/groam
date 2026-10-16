import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import { TripTransferEditor } from './trip-transfer-editor';

const env = vi.hoisted(() => ({ isMobile: false }));

vi.mock('@groam/ui/hooks/use-mobile', () => ({ useIsMobile: () => env.isMobile }));

vi.mock('@/features/trips/trip-transfer-form/trip-transfer-form', () => ({
  TripTransferForm: ({
    fullScreen,
    initial,
    onCancel,
    onRemove,
    onSave
  }: {
    fullScreen: boolean;
    initial: unknown;
    onCancel: () => void;
    onRemove: () => void;
    onSave: (input: unknown) => void;
  }) => (
    <form aria-label="Transfer form">
      <p>{initial ? 'editing existing' : 'creating new'}</p>
      <p>{fullScreen ? 'full screen' : 'inline'}</p>
      <button onClick={onCancel} type="button">
        Cancel form
      </button>
      <button onClick={() => onSave({ mode: 'train' })} type="button">
        Save form
      </button>
      <button onClick={onRemove} type="button">
        Remove form
      </button>
    </form>
  )
}));

function makeTransfer(overrides: Partial<TransferView> = {}): TransferView {
  return {
    attachments: [],
    costAmount: null,
    costSplit: 'total',
    durationMinutes: null,
    mode: 'train',
    notes: null,
    timing: null,
    ...overrides
  } as unknown as TransferView;
}

function renderEditor(props: Partial<Parameters<typeof TripTransferEditor>[0]> = {}) {
  const onRemove = vi.fn().mockResolvedValue(true);
  const onSave = vi.fn().mockResolvedValue(true);
  return {
    onRemove,
    onSave,
    ready: render(
      <TripTransferEditor
        canManage
        currency="EUR"
        fromLabel="Lisbon"
        kind="destination"
        maximumDay={5}
        minimumDay={1}
        onRemove={onRemove}
        onSave={onSave}
        toLabel="Porto"
        transfer={null}
        tripStartDate={null}
        {...props}
      />
    )
  };
}

beforeEach(() => {
  env.isMobile = false;
});

describe('TripTransferEditor', () => {
  test('renders nothing for a viewer when there is no transfer', async () => {
    await renderEditor({ canManage: false }).ready;
    await expect
      .element(page.getByRole('button', { name: /Plan travel/u }))
      .not.toBeInTheDocument();
  });

  test.each([
    ['destination', 'Plan travel'],
    ['activity', 'Plan travel to Porto']
  ] as const)('offers to plan travel for a %s', async (kind, label) => {
    await renderEditor({ kind }).ready;
    await expect
      .poll(
        () =>
          page.getByRole('button', { name: 'Plan travel from Lisbon to Porto' }).element()
            .textContent
      )
      .toBe(label);
  });

  test('opens the form inline from the empty button and cancels back', async () => {
    await renderEditor().ready;
    await page.getByRole('button', { name: 'Plan travel from Lisbon to Porto' }).click();
    await expect.element(page.getByText('creating new')).toBeVisible();
    await expect.element(page.getByText('inline')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel form' }).click();
    await expect.element(page.getByRole('form', { name: 'Transfer form' })).not.toBeInTheDocument();
  });

  test('passes save and remove through to the form', async () => {
    const { onRemove, onSave, ready } = renderEditor();
    await ready;
    await page.getByRole('button', { name: 'Plan travel from Lisbon to Porto' }).click();
    await page.getByRole('button', { name: 'Save form' }).click();
    await page.getByRole('button', { name: 'Remove form' }).click();
    expect(onSave).toHaveBeenCalledWith({ mode: 'train' });
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  test('opens the form in a full-screen sheet on mobile', async () => {
    env.isMobile = true;
    await renderEditor().ready;
    await page.getByRole('button', { name: 'Plan travel from Lisbon to Porto' }).click();
    await expect.element(page.getByText('full screen')).toBeVisible();
    await expect
      .element(page.getByRole('dialog', { name: 'Travel from Lisbon to Porto' }))
      .toBeInTheDocument();
  });

  test('summarises an existing transfer with mode, cost, duration, and notes', async () => {
    await renderEditor({
      transfer: makeTransfer({
        costAmount: 40,
        costSplit: 'per_person',
        durationMinutes: 150,
        notes: 'Window seat'
      })
    }).ready;
    await expect.element(page.getByText('Train')).toBeVisible();
    await expect.element(page.getByText(/\/ person/u)).toBeVisible();
    await expect.element(page.getByText('· 2 hr 30 min')).toBeVisible();
    await expect.element(page.getByText('· Window seat')).toBeVisible();
    await expect.element(page.getByText('to Porto')).not.toBeInTheDocument();
  });

  test('shows the destination for activity transfers', async () => {
    await renderEditor({ kind: 'activity', transfer: makeTransfer({ mode: 'walk' }) }).ready;
    await expect.element(page.getByText('Walk')).toBeVisible();
    await expect.element(page.getByText('to Porto')).toBeVisible();
  });

  test('shows exact timing when scheduled', async () => {
    await renderEditor({
      transfer: makeTransfer({
        timing: { endDay: 2, endTime: '10:30', startDay: 2, startTime: '09:00' }
      } as Partial<TransferView>)
    }).ready;
    await expect.element(page.getByText(/Day 2 at .*9:00.*10:30/u)).toBeVisible();
  });

  test('links attachments that have urls and counts those without', async () => {
    await renderEditor({
      transfer: makeTransfer({
        attachments: [
          { id: 'a', name: 'ticket.pdf', url: 'https://example.test/ticket.pdf' },
          { id: 'b', name: 'pending.pdf', url: null }
        ]
      } as Partial<TransferView>)
    }).ready;
    await expect
      .element(page.getByRole('link', { name: 'Open ticket.pdf' }))
      .toHaveAttribute('href', 'https://example.test/ticket.pdf');
    await expect
      .element(page.getByRole('link', { name: 'Open pending.pdf' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByText('2')).toBeVisible();
  });

  test('edits an existing transfer when the viewer can manage it', async () => {
    await renderEditor({ transfer: makeTransfer() }).ready;
    await page.getByRole('button', { name: 'Edit travel to Porto' }).click();
    await expect.element(page.getByText('editing existing')).toBeVisible();
  });

  test('hides the edit button from viewers', async () => {
    await renderEditor({ canManage: false, transfer: makeTransfer() }).ready;
    await expect.element(page.getByText('Train')).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Edit travel to Porto' }))
      .not.toBeInTheDocument();
  });
});
