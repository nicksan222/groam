import { DEFAULT_ASSISTANT_FAILURE } from '@groam/ai-contracts/errors';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { FailedResponse } from './failed-response';

afterEach(cleanup);

test('shows the default failure copy when no provider error is available', () => {
  render(<FailedResponse disabled={false} />);
  expect(screen.getByRole('alert').textContent).toContain(DEFAULT_ASSISTANT_FAILURE);
});

test('forwards the model provider error in the failed bubble', () => {
  render(
    <FailedResponse
      disabled={false}
      error={{
        data: {
          error: {
            message:
              'This request requires more credits, or fewer max_tokens. You requested up to 1024 tokens, but can only afford 245.'
          }
        },
        statusCode: 402
      }}
    />
  );
  expect(screen.getByRole('alert').textContent).toContain(
    'The model provider said: This request requires more credits, or fewer max_tokens. You requested up to 1024 tokens, but can only afford 245.'
  );
});

test('resends from the failed bubble', async () => {
  const onResend = vi.fn().mockResolvedValue(true);
  render(<FailedResponse disabled={false} onResend={onResend} />);
  fireEvent.click(screen.getByRole('button', { name: 'Resend message' }));
  expect(onResend).toHaveBeenCalledOnce();
});
