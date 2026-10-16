import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DEFAULT_ASSISTANT_FAILURE } from '#ai/backend/errors';
import { FailedResponse } from './failed-response';

test('shows the default failure copy when no provider error is available', async () => {
  await render(<FailedResponse disabled={false} />);
  await expect.element(page.getByRole('alert')).toHaveTextContent(DEFAULT_ASSISTANT_FAILURE);
});

test('explains ChatGPT app usage limits in the failed bubble', async () => {
  await render(
    <FailedResponse
      disabled={false}
      error={{
        data: {
          error: {
            code: 'subscription_sharing_usage_limit_exceeded'
          }
        },
        statusCode: 429
      }}
    />
  );
  await expect
    .element(page.getByRole('alert'))
    .toHaveTextContent(
      'ChatGPT usage limit reached for this app. Review your limits in ChatGPT Settings → Usage before trying again.'
    );
});

test('resends from the failed bubble', async () => {
  const onResend = vi.fn().mockResolvedValue(true);
  await render(<FailedResponse disabled={false} onResend={onResend} />);
  await page.getByRole('button', { name: 'Resend message' }).click();
  expect(onResend).toHaveBeenCalledOnce();
});
