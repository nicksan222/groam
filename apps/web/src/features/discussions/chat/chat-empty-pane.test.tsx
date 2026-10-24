import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ChatEmptyPane } from './chat-empty-pane';

test('invites the viewer to pick a chat', async () => {
  await render(<ChatEmptyPane />);
  await expect.element(page.getByText('Pick a chat or start one.')).toBeVisible();
  await expect.element(page.getByRole('heading')).not.toBeInTheDocument();
});
