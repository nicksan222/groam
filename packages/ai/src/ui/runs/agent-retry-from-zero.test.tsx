import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { AgentRetryFromZeroButton } from './agent-retry-from-zero';

test('calls retry and goes inert while the request is in flight', async () => {
  let finishRetry: (() => void) | undefined;
  const onRetry = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finishRetry = resolve;
      })
  );
  await render(<AgentRetryFromZeroButton onRetry={onRetry} testId="agent-retry-from-zero" />);
  const button = page.getByRole('button', { name: 'Retry from zero' }).element();
  expect(button.getAttribute('aria-label')).toBe('Retry from zero');
  expect(button.textContent).toBe('');
  await userEvent.click(button);
  expect(onRetry).toHaveBeenCalledOnce();
  expect(button.getAttribute('aria-disabled')).toBe('true');
  finishRetry?.();
  await expect.element(page.getByRole('button', { name: 'Retry from zero' })).toBeEnabled();
});
