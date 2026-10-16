import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TransferActions } from './transfer-actions';

function setup(overrides: Partial<Parameters<typeof TransferActions>[0]> = {}) {
  const props = {
    canSave: true,
    isBusy: false,
    isPending: false,
    onCancel: vi.fn(),
    onSave: vi.fn(),
    ...overrides
  };
  return props;
}

describe('TransferActions', () => {
  test('fires cancel and save callbacks', async () => {
    const props = setup();
    await render(<TransferActions {...props} />);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Save travel' }).click();
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledTimes(1);
  });

  test.each<[string, Partial<Parameters<typeof TransferActions>[0]>, boolean, boolean]>([
    ['cannot save', { canSave: false }, true, false],
    ['is busy', { isBusy: true }, false, true]
  ])('disables correct buttons when it %s', async (_, overrides, saveDisabled, cancelDisabled) => {
    await render(<TransferActions {...setup(overrides)} />);
    const save = page.getByRole('button', { name: 'Save travel' });
    const cancel = page.getByRole('button', { name: 'Cancel' });
    if (saveDisabled) await expect.element(save).toBeDisabled();
    else await expect.element(save).toBeEnabled();
    if (cancelDisabled) await expect.element(cancel).toBeDisabled();
    else await expect.element(cancel).toBeEnabled();
  });

  test('shows a spinner while pending', async () => {
    await render(<TransferActions {...setup({ isPending: true })} />);
    await expect.element(page.getByRole('status')).toBeVisible();
  });
});
