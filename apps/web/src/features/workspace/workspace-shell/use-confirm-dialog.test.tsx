import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ConfirmDialogProvider, useConfirm } from './use-confirm-dialog';

function Trigger({ onResult }: { onResult: (value: boolean) => void }) {
  const confirm = useConfirm();
  const [, setN] = useState(0);
  return (
    <button
      onClick={async () => {
        const value = await confirm('Delete trip?', 'This cannot be undone.');
        onResult(value);
        setN((n) => n + 1);
      }}
    >
      Ask
    </button>
  );
}

afterEach(() => vi.restoreAllMocks());

describe('ConfirmDialogProvider', () => {
  test('shows the title and description and resolves true on Continue', async () => {
    const onResult = vi.fn();
    await render(
      <ConfirmDialogProvider>
        <Trigger onResult={onResult} />
      </ConfirmDialogProvider>
    );
    await page.getByRole('button', { name: 'Ask' }).click();
    await expect.element(page.getByRole('alertdialog', { name: 'Delete trip?' })).toBeVisible();
    await expect.element(page.getByText('This cannot be undone.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect.poll(() => onResult.mock.calls).toEqual([[true]]);
    await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
  });

  test('resolves false on Cancel', async () => {
    const onResult = vi.fn();
    await render(
      <ConfirmDialogProvider>
        <Trigger onResult={onResult} />
      </ConfirmDialogProvider>
    );
    await page.getByRole('button', { name: 'Ask' }).click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect.poll(() => onResult.mock.calls).toEqual([[false]]);
  });

  test('resolves false when dismissed with Escape', async () => {
    const onResult = vi.fn();
    await render(
      <ConfirmDialogProvider>
        <Trigger onResult={onResult} />
      </ConfirmDialogProvider>
    );
    await page.getByRole('button', { name: 'Ask' }).click();
    await expect.element(page.getByRole('alertdialog')).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await expect.poll(() => onResult.mock.calls).toEqual([[false]]);
  });

  test.each([true, false])(
    'falls back to window.confirm (%s) without a provider',
    async (answer) => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(answer);
      const onResult = vi.fn();
      await render(<Trigger onResult={onResult} />);
      await page.getByRole('button', { name: 'Ask' }).click();
      await expect.poll(() => onResult.mock.calls).toEqual([[answer]]);
      expect(confirmSpy).toHaveBeenCalledWith('Delete trip?\n\nThis cannot be undone.');
    }
  );
});
