import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { TransferView } from '@/features/trips/trip-transfer-options';
import { TransferRemoval } from './transfer-removal';

const initial = {
  attachments: [],
  costAmount: null,
  costSplit: null,
  durationMinutes: 30,
  mode: 'train',
  notes: '',
  timing: null
} as unknown as TransferView;

describe('TransferRemoval', () => {
  test('renders nothing for a new transfer', async () => {
    await render(
      <TransferRemoval
        hasChanges={false}
        initial={null}
        isBusy={false}
        onRemove={vi.fn()}
        status={null}
      />
    );
    await expect
      .element(page.getByRole('button', { name: 'Remove route' }))
      .not.toBeInTheDocument();
  });

  test.each([
    ['saved and unchanged', false, null, true],
    ['has changes', true, null, false],
    ['has status', false, { kind: 'error' as const, message: 'x' }, false]
  ])('saved hint when %s', async (_, hasChanges, status, visible) => {
    await render(
      <TransferRemoval
        hasChanges={hasChanges}
        initial={initial}
        isBusy={false}
        onRemove={vi.fn()}
        status={status}
      />
    );
    const hint = page.getByText('Everything is saved.');
    if (visible) await expect.element(hint).toBeVisible();
    else await expect.element(hint).not.toBeInTheDocument();
  });

  test('fires onRemove, disabled when busy', async () => {
    const onRemove = vi.fn();
    const view = await render(
      <TransferRemoval
        hasChanges={false}
        initial={initial}
        isBusy={false}
        onRemove={onRemove}
        status={null}
      />
    );
    await page.getByRole('button', { name: 'Remove route' }).click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    await view.rerender(
      <TransferRemoval
        hasChanges={false}
        initial={initial}
        isBusy
        onRemove={onRemove}
        status={null}
      />
    );
    await expect.element(page.getByRole('button', { name: 'Remove route' })).toBeDisabled();
  });
});
