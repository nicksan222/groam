import type { UIMessage } from '@convex-dev/agent/react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { UserMessage } from './user-message';

vi.mock('@convex-dev/agent/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@convex-dev/agent/react')>()),
  useSmoothText: (text: string) => [text]
}));
afterEach(cleanup);

test('keeps resend available for an earlier message while a newer one is active', async () => {
  const onResend = vi.fn().mockResolvedValue(true);
  render(
    <UserMessage
      disabled
      message={message('user', 'Book Portugal', 'success')}
      onResend={onResend}
      resendDisabled={false}
    />
  );

  const resend = screen.getByRole('button', { name: 'Resend message' });
  expect(resend.hasAttribute('disabled')).toBe(false);
  resend.click();
  expect(onResend).toHaveBeenCalledOnce();
});

test('renders traveler messages with pending delivery state', () => {
  render(<UserMessage disabled={false} message={message('user', 'Book Portugal', 'pending')} />);
  expect(screen.getByText('Book Portugal')).toBeDefined();
  expect(screen.getByRole('status').textContent).toContain('Sending');
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
