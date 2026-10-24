import { Sparkles } from '@groam/icons';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RemovableChip } from './removable-chip';

test('renders a labeled chip and calls onRemove', async () => {
  const onRemove = vi.fn();

  await render(
    <RemovableChip
      icon={<Sparkles className="size-3" />}
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

test('is the squarer attachment chip', async () => {
  const { container } = await render(
    <RemovableChip label="Lisbon" onRemove={() => undefined} removeLabel="Remove Lisbon" />
  );

  const chip = container.firstElementChild;
  expect(chip?.getAttribute('data-slot')).toBe('removable-chip');
  expect(chip?.className).toContain('rounded-lg');
  expect(chip?.className).not.toContain('rounded-full');
});
