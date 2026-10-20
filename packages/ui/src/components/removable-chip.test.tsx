import { Sparkles } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RemovableChip } from './removable-chip';

test('renders a labeled chip and calls onRemove', async () => {
  const onRemove = vi.fn();

  await render(
    <RemovableChip
      icon={Sparkles}
      label="@groam"
      onRemove={onRemove}
      removeLabel="Remove @groam"
      title="Groam will reply in this chat"
    />
  );

  await expect.element(page.getByText('@groam')).toBeInTheDocument();
  await page.getByRole('button', { name: 'Remove @groam' }).click();
  expect(onRemove).toHaveBeenCalledTimes(1);
});
