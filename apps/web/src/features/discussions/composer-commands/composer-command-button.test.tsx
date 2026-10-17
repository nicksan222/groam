import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ComposerCommandButton } from './composer-command-button';

const api = (text: string): MessageComposerApi => ({
  insertText: vi.fn(),
  isSubmitting: false,
  setText: vi.fn(),
  text
});

test('starts a command from an empty composer', async () => {
  const composer = api('');
  await render(<ComposerCommandButton api={composer} />);
  await page.getByRole('button', { name: 'Commands' }).click();
  expect(composer.insertText).toHaveBeenCalledWith('/');
});

test('never overwrites a draft', async () => {
  await render(<ComposerCommandButton api={api('draft')} />);
  await expect.element(page.getByRole('button', { name: 'Commands' })).toBeDisabled();
});
