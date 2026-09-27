import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AgentRetryFromZeroButton } from './agent-retry-from-zero';

afterEach(cleanup);

test('calls retry and disables while the request is in flight', async () => {
  let finishRetry: (() => void) | undefined;
  const onRetry = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        finishRetry = resolve;
      })
  );
  render(<AgentRetryFromZeroButton onRetry={onRetry} testId="agent-retry-from-zero" />);
  const button = screen.getByRole('button', { name: 'Retry from zero' });
  expect(button.getAttribute('aria-label')).toBe('Retry from zero');
  expect(button.textContent).toBe('');
  fireEvent.click(button);
  expect(onRetry).toHaveBeenCalledOnce();
  expect(button).toHaveProperty('disabled', true);
  finishRetry?.();
  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Retry from zero' })).toHaveProperty(
      'disabled',
      false
    );
  });
});
