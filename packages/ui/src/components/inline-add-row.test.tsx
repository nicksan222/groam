import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { InlineAddRow } from './inline-add-row';

test('Enter adds the trimmed text, clears the input, and keeps focus', async () => {
  const onAdd = vi.fn(() => Promise.resolve(true));
  await render(<InlineAddRow label="Add a question" onAdd={onAdd} placeholder="Add…" />);
  const input = page.getByRole('textbox', { name: 'Add a question' });
  await input.fill('  Which beach?  ');
  await userEvent.keyboard('{Enter}');
  expect(onAdd).toHaveBeenCalledWith('Which beach?');
  await expect.element(input).toHaveValue('');
  expect(document.activeElement).toBe(input.element());
});

test('keeps the text when the add fails, and ignores empty input', async () => {
  const onAdd = vi.fn(() => Promise.resolve(null));
  await render(<InlineAddRow label="Add a question" onAdd={onAdd} placeholder="Add…" />);
  const input = page.getByRole('textbox', { name: 'Add a question' });
  await input.click();
  await userEvent.keyboard('{Enter}');
  expect(onAdd).not.toHaveBeenCalled();
  await input.fill('Ferry times');
  await userEvent.keyboard('{Enter}');
  await expect.element(input).toHaveValue('Ferry times');
});

test('keeps whatever was typed while the last add was saving', async () => {
  let finish: (value: boolean) => void = () => {};
  const onAdd = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
  await render(<InlineAddRow label="Add a question" onAdd={onAdd} placeholder="Add…" />);
  const input = page.getByRole('textbox', { name: 'Add a question' });
  await input.fill('First');
  await userEvent.keyboard('{Enter}');
  await input.fill('Second');
  finish(true);
  await expect.element(page.getByRole('button', { name: 'Add' })).toBeEnabled();
  await expect.element(input).toHaveValue('Second');
});

test('shows a thrown error under the row', async () => {
  const onAdd = vi.fn(() => Promise.reject(new Error('List is full')));
  await render(<InlineAddRow label="Item" onAdd={onAdd} placeholder="Add an item…" />);
  await page.getByRole('textbox', { name: 'Item' }).fill('Tent');
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('alert')).toHaveTextContent('List is full');
});

test('the field variant is a framed input without a button', async () => {
  await render(
    <InlineAddRow label="Add a question" onAdd={vi.fn()} placeholder="Add" variant="field" />
  );
  await expect.element(page.getByRole('textbox', { name: 'Add a question' })).toBeInTheDocument();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});
