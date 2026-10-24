import type { Id } from '@groam/backend/data-model';
import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import { TripTransferForm } from './trip-transfer-form';

const deps = vi.hoisted(() => ({
  confirm: vi.fn(async (_title: string, _description: string) => true),
  uploadMedia: vi.fn(async (_file: File, _message?: null | string) => 'media-new' as unknown)
}));

vi.mock('@/features/media/hooks/use-media-upload', () => ({
  useMediaUpload: () => deps.uploadMedia
}));

vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => deps.confirm
}));

type Props = Parameters<typeof TripTransferForm>[0];

function makeTransfer(overrides: Record<string, unknown> = {}) {
  return {
    attachments: [{ id: 'media-1' as Id<'media'>, name: 'ticket.pdf' }],
    costAmount: null,
    costSplit: null,
    durationMinutes: 90,
    mode: 'train',
    notes: 'Platform 4',
    timing: null,
    ...overrides
  } as unknown as TransferView;
}

function setup(overrides: Partial<Props> = {}) {
  const props: Props = {
    fromLabel: 'Rome',
    initial: null,
    kind: 'destination',
    maximumDay: 5,
    minimumDay: 1,
    onCancel: vi.fn(),
    onRemove: vi.fn(async () => true),
    onSave: vi.fn(async () => true),
    toLabel: 'Paris',
    tripStartDate: '2026-06-01',
    ...overrides
  };
  return props;
}

beforeEach(() => {
  deps.confirm.mockReset().mockResolvedValue(true);
  deps.uploadMedia.mockReset().mockResolvedValue('media-new');
});

describe('TripTransferForm', () => {
  test('a new transfer shows the route, defaults and no remove button', async () => {
    await render(<TripTransferForm {...setup()} />);
    await expect.element(page.getByText('Travel connection')).toBeVisible();
    await expect.element(page.getByRole('heading', { name: /Rome.*Paris/ })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: 'Remove route' }))
      .not.toBeInTheDocument();
    await expect.element(page.getByRole('textbox', { name: 'Travel notes' })).toHaveTextContent('');
    await expect.element(page.getByRole('button', { exact: true, name: 'Save' })).toBeEnabled();
  });

  test.each([
    ['activity', 'Walk'],
    ['destination', 'Train']
  ] as const)('a new %s transfer defaults to %s', async (kind, label) => {
    await render(<TripTransferForm {...setup({ kind })} />);
    expect(page.getByRole('combobox', { name: 'Transport mode' }).element().textContent).toContain(
      label
    );
  });

  test('an existing transfer fills the form and is saved but disabled until changed', async () => {
    await render(<TripTransferForm {...setup({ initial: makeTransfer() })} />);
    await expect
      .element(page.getByRole('textbox', { name: 'Travel notes' }))
      .toHaveTextContent('Platform 4');
    await expect.element(page.getByLabelText('Estimated minutes')).toHaveValue(90);
    await expect.element(page.getByText('ticket.pdf')).toBeVisible();
    await expect.element(page.getByText('Everything is saved.')).toBeVisible();
    await expect.element(page.getByRole('button', { exact: true, name: 'Save' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'Travel notes' }).fill('Platform 5');
    await expect.element(page.getByRole('button', { exact: true, name: 'Save' })).toBeEnabled();
    await expect.element(page.getByText('Everything is saved.')).not.toBeInTheDocument();
  });

  test('saving sends the edited input and closes the form', async () => {
    const props = setup();
    await render(<TripTransferForm {...props} />);
    await page.getByLabelText('Estimated minutes').fill('45');
    await page.getByRole('textbox', { name: 'Travel notes' }).fill('  Meet at the gate  ');
    await page.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect.poll(() => (props.onSave as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: { minutes: 45 },
        mode: 'train',
        notes: 'Meet at the gate'
      })
    );
    await expect.poll(() => (props.onCancel as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  test('a failed save keeps the form open and explains', async () => {
    const props = setup({ onSave: vi.fn(async () => false) });
    await render(<TripTransferForm {...props} />);
    await page.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Travel details could not be saved. Your draft is still here.');
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  test('an invalid duration blocks saving', async () => {
    await render(<TripTransferForm {...setup()} />);
    await page.getByLabelText('Estimated minutes').fill('0');
    await expect.element(page.getByRole('button', { exact: true, name: 'Save' })).toBeDisabled();
  });

  test('cancel closes immediately when nothing changed', async () => {
    const props = setup({ initial: makeTransfer() });
    await render(<TripTransferForm {...props} />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(deps.confirm).not.toHaveBeenCalled();
  });

  test.each([
    ['confirmed', true, 1],
    ['declined', false, 0]
  ])('cancel with edits asks to discard (%s)', async (_, answer, closes) => {
    deps.confirm.mockResolvedValue(answer);
    const props = setup({ initial: makeTransfer() });
    await render(<TripTransferForm {...props} />);
    await page.getByRole('textbox', { name: 'Travel notes' }).fill('changed');
    await page.getByRole('button', { name: 'Close travel editor' }).click();
    await expect.poll(() => deps.confirm.mock.calls.length).toBe(1);
    expect(deps.confirm.mock.calls[0]?.[0]).toBe('Discard unsaved travel?');
    await expect
      .poll(() => (props.onCancel as ReturnType<typeof vi.fn>).mock.calls.length)
      .toBe(closes);
  });

  test.each([
    ['confirmed', true, 1, 1],
    ['declined', false, 0, 0]
  ])('removing the route asks first (%s)', async (_, answer, removed, closed) => {
    deps.confirm.mockResolvedValue(answer);
    const props = setup({ initial: makeTransfer() });
    await render(<TripTransferForm {...props} />);
    await page.getByRole('button', { name: 'Remove route' }).click();
    await expect.poll(() => deps.confirm.mock.calls.length).toBe(1);
    expect(deps.confirm).toHaveBeenCalledWith(
      'Remove travel details?',
      'This removes travel from Rome to Paris.'
    );
    await expect
      .poll(() => (props.onRemove as ReturnType<typeof vi.fn>).mock.calls.length)
      .toBe(removed);
    await expect
      .poll(() => (props.onCancel as ReturnType<typeof vi.fn>).mock.calls.length)
      .toBe(closed);
  });

  test('a failed removal shows an error and stays open', async () => {
    const props = setup({ initial: makeTransfer(), onRemove: vi.fn(async () => false) });
    await render(<TripTransferForm {...props} />);
    await page.getByRole('button', { name: 'Remove route' }).click();
    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('The travel connection could not be removed.');
    expect(props.onCancel).not.toHaveBeenCalled();
  });

  test('exact timing toggles on and off', async () => {
    await render(<TripTransferForm {...setup()} />);
    await page.getByRole('button', { name: 'Add exact departure and arrival' }).click();
    await expect
      .element(page.getByRole('group', { name: 'Exact departure & arrival' }))
      .toBeVisible();
    await page.getByRole('button', { name: 'Remove exact times' }).click();
    await expect
      .element(page.getByRole('button', { name: 'Add exact departure and arrival' }))
      .toBeVisible();
  });

  test('removing an attachment drops the chip', async () => {
    await render(<TripTransferForm {...setup({ initial: makeTransfer() })} />);
    await page.getByRole('button', { name: 'Remove ticket.pdf' }).click();
    await expect.element(page.getByText('ticket.pdf')).not.toBeInTheDocument();
    await expect.element(page.getByText('PDFs, images, or video.')).toBeVisible();
  });

  test('uploading a file attaches it', async () => {
    await render(<TripTransferForm {...setup()} />);
    await page
      .getByLabelText('Upload files for travel from Rome to Paris')
      .upload(new File(['x'], 'boarding.pdf', { type: 'application/pdf' }));
    await expect.element(page.getByText('boarding.pdf')).toBeVisible();
    expect(deps.uploadMedia.mock.calls[0]?.[0].name).toBe('boarding.pdf');
  });

  test('a failed upload warns', async () => {
    deps.uploadMedia.mockResolvedValue(null);
    await render(<TripTransferForm {...setup()} />);
    await page
      .getByLabelText('Upload files for travel from Rome to Paris')
      .upload(new File(['x'], 'boarding.pdf', { type: 'application/pdf' }));
    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent('1 file could not be uploaded.');
  });
});
