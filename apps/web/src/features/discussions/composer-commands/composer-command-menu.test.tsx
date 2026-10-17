import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ComposerCommand } from '@/types/discussions';
import { ComposerCommandMenu } from './composer-command-menu';

const api = (text: string): MessageComposerApi => ({
  insertText: vi.fn(),
  isSubmitting: false,
  setText: vi.fn(),
  text
});

const pick = vi.fn();
const summarize = vi.fn();
const commands: ComposerCommand[] = [
  { description: 'Ask for a summary', name: 'summarize', run: summarize },
  {
    argument: 'item',
    description: 'Link an item',
    name: 'link',
    options: () => [{ group: 'Issues', id: 'i1', label: 'Book flights', run: pick }]
  }
];

test('lists commands for a bare slash and runs one without input', async () => {
  const composer = api('/');
  await render(<ComposerCommandMenu api={composer} commands={commands} />);
  expect(page.getByTestId(testIds.composerCommandOption).elements()).toHaveLength(2);
  await page.getByRole('button', { name: /summarize/ }).click();
  expect(composer.setText).toHaveBeenCalledWith('');
  expect(summarize).toHaveBeenCalledOnce();
});

test('fills the name of a command that takes input', async () => {
  const composer = api('/li');
  await render(<ComposerCommandMenu api={composer} commands={commands} />);
  await page.getByRole('button', { name: /link/ }).click();
  expect(composer.setText).toHaveBeenCalledWith('/link ');
});

test('lists choices once the command is typed', async () => {
  const composer = api('/link bo');
  await render(<ComposerCommandMenu api={composer} commands={commands} />);
  await page.getByRole('button', { name: /Book flights/ }).click();
  expect(pick).toHaveBeenCalledOnce();
  expect(composer.setText).toHaveBeenCalledWith('');
});

test('stays hidden for normal text', async () => {
  await render(<ComposerCommandMenu api={api('hello')} commands={commands} />);
  await expect.element(page.getByTestId(testIds.composerCommandMenu)).not.toBeInTheDocument();
});
