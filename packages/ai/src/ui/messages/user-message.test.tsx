import type { UIMessage } from '@convex-dev/agent/react';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { UserMessage } from './user-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));

test('keeps resend available for an earlier message while a newer one is active', async () => {
  const onResend = vi.fn().mockResolvedValue(true);
  await render(
    <UserMessage
      disabled
      message={message('user', 'Book Portugal', 'success')}
      onResend={onResend}
      resendDisabled={false}
    />
  );

  const resend = page.getByRole('button', { name: 'Resend message' });
  await expect.element(resend).toBeEnabled();
  await resend.click();
  expect(onResend).toHaveBeenCalledOnce();
});

test('renders traveler messages with pending delivery state', async () => {
  await render(
    <UserMessage disabled={false} message={message('user', 'Book Portugal', 'pending')} />
  );
  await expect.element(page.getByText('Book Portugal')).toBeInTheDocument();
  expect(page.getByRole('status').element().textContent).toContain('Sending');
});

test('renders traveler Markdown', async () => {
  await render(
    <UserMessage disabled={false} message={message('user', 'Book **Portugal**', 'success')} />
  );
  expect(page.getByText('Portugal').element().getAttribute('data-streamdown')).toBe('strong');
});

function message(role: 'user', text: string, status: 'pending' | 'success'): UIMessage {
  return {
    _creationTime: 1,
    id: 'user-1',
    key: 'user-1',
    order: 1,
    parts: [],
    role,
    status,
    stepOrder: 0,
    text
  };
}
