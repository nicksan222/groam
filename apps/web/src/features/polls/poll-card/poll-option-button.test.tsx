import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { PollOptionButton } from './poll-option-button';

test('a selected checkbox option shows its count and draws its share', async () => {
  const onToggle = vi.fn();
  await render(
    <PollOptionButton
      count={3}
      disabled={false}
      label="Pizza"
      multiSelect
      onToggle={onToggle}
      selected
      share={0.5}
    />
  );
  const option = page.getByRole('checkbox', { name: /Pizza/ });
  await expect.element(option).toBeChecked();
  await expect.element(option).toHaveTextContent('Pizza3');
  await option.click();
  expect(onToggle).toHaveBeenCalledOnce();
  const bar = option.element().querySelector('[aria-hidden]') as HTMLElement;
  expect(bar.style.width).toBe('50%');
});

test('a disabled radio option ignores clicks', async () => {
  await render(
    <PollOptionButton
      count={0}
      disabled
      label="Tapas"
      multiSelect={false}
      onToggle={vi.fn()}
      selected={false}
      share={0}
    />
  );
  await expect.element(page.getByRole('radio', { name: /Tapas/ })).toBeDisabled();
  await expect.element(page.getByRole('radio', { name: /Tapas/ })).not.toBeChecked();
});
