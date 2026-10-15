import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DEFAULT_ASSISTANT_FAILURE } from '#ai/backend/errors';
import { FailedResponse } from './failed-response';

test('shows the default failure copy when no provider error is available', async () => {
  await render(<FailedResponse disabled={false} />);
  await expect.element(page.getByRole('alert')).toHaveTextContent(DEFAULT_ASSISTANT_FAILURE);
});

test('forwards the model provider error in the failed bubble', async () => {
  await render(
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
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent(
      'The model provider said: This request requires more credits, or fewer max_tokens. You requested up to 1024 tokens, but can only afford 245.'
    );
});

test('resends from the failed bubble', async () => {
  const onResend = vi.fn().mockResolvedValue(true);
  await render(<FailedResponse disabled={false} onResend={onResend} />);
  await page.getByRole('button', { name: 'Resend message' }).click();
  expect(onResend).toHaveBeenCalledOnce();
});
