import { render } from '@groam/vitest-config/react';
import type { ReactNode } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AssistantReplyError } from './assistant-reply-error';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children, params }: { children?: ReactNode; params: { section: string } }) => (
    <a href={`/settings/${params.section}`}>{children}</a>
  )
}));

test('turns a missing ChatGPT connection into a settings link', async () => {
  await render(
    <AssistantReplyError error="Connect ChatGPT in Settings → AI to use your ChatGPT plan." mine />
  );
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent('Groam needs your ChatGPT plan to reply. Connect ChatGPT');
  await expect
    .element(page.getByRole('link', { name: 'Connect ChatGPT' }))
    .toHaveAttribute('href', '/settings/ai');
});

test('shows other errors as they are', async () => {
  await render(<AssistantReplyError error="Too many requests" mine={false} />);
  await expect
    .element(page.getByRole('status'))
    .toHaveTextContent("Groam couldn't reply: Too many requests");
});
