import { expect, test, vi } from 'vite-plus/test';
import type { ComposerCommand } from '@/types/discussions';
import { parseCommandInput, resolveCommandSubmit } from './composer-command';

const pick = vi.fn();
const save = vi.fn();
const summarize = vi.fn();
const commands: ComposerCommand[] = [
  { description: 'Summarize', name: 'summarize', run: summarize },
  {
    argument: 'item',
    description: 'Link',
    name: 'link',
    options: (query) =>
      ['Book flights', 'Book hotel']
        .filter((label) => label.toLowerCase().includes(query.toLowerCase()))
        .map((label) => ({ id: label, label, run: () => pick(label) }))
  },
  { argument: 'text', description: 'Brief', name: 'brief', run: save }
];

test('parses names and arguments', () => {
  expect(parseCommandInput('/link hotel')).toEqual({
    argument: 'hotel',
    hasArgument: true,
    name: 'link'
  });
  expect(parseCommandInput('/sum')).toEqual({ argument: '', hasArgument: false, name: 'sum' });
  expect(parseCommandInput('hello /link')).toBeNull();
});

test('leaves plain text and a bare slash as messages', () => {
  expect(resolveCommandSubmit('see https://a.example', commands)).toBeNull();
  expect(resolveCommandSubmit('/ hi', commands)).toBeNull();
});

test('runs a unique prefix and free-text commands', async () => {
  const sum = resolveCommandSubmit('/sum', commands);
  if (!sum || 'error' in sum) throw new Error('expected a command');
  await sum.run();
  expect(summarize).toHaveBeenCalledOnce();
  const brief = resolveCommandSubmit('/brief Find a quiet hotel', commands);
  if (!brief || 'error' in brief) throw new Error('expected a command');
  await brief.run();
  expect(save).toHaveBeenCalledWith('Find a quiet hotel');
});

test('picks a single or exact option and explains the rest', async () => {
  const single = resolveCommandSubmit('/link hotel', commands);
  if (!single || 'error' in single) throw new Error('expected a pick');
  await single.run();
  expect(pick).toHaveBeenCalledWith('Book hotel');
  expect(resolveCommandSubmit('/link book', commands)).toEqual({
    error: 'Pick one from the list to link'
  });
  expect(resolveCommandSubmit('/link train', commands)).toEqual({
    error: 'Nothing to link matches that'
  });
  expect(resolveCommandSubmit('/brief', commands)).toEqual({ error: 'Add text after /brief' });
  expect(resolveCommandSubmit('/nope', commands)).toEqual({ error: 'Unknown command /nope' });
});
