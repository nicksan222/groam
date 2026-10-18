import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ApplyIdeaDialog } from './apply-idea-dialog';

test('explains and confirms the shared-plan update', async () => {
  const onApply = vi.fn().mockResolvedValue(true);
  const onOpenChange = vi.fn();
  await render(
    <ApplyIdeaDialog onApply={onApply} onOpenChange={onOpenChange} open pending={false} />
  );

  await expect.element(page.getByText(/Everyone will see the updated trip/u)).toBeInTheDocument();
  await page.getByRole('button', { name: 'Apply to shared trip' }).click();
  await vi.waitFor(() => expect(onApply).toHaveBeenCalledOnce());
  await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
});

test('locks every exit while the idea is applying', async () => {
  await render(<ApplyIdeaDialog onApply={vi.fn()} onOpenChange={vi.fn()} open pending />);
  await expect.element(page.getByRole('alertdialog')).toHaveAttribute('aria-busy', 'true');
  await expect.element(page.getByRole('button', { name: 'Keep reviewing' })).toBeDisabled();
  await expect.element(page.getByTestId('apply-idea-confirm')).toBeDisabled();
});
