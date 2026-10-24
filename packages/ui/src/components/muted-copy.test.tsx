import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { MutedCopy } from './muted-copy';

test('renders muted supporting copy', async () => {
  await render(<MutedCopy>Nothing is waiting on your take right now.</MutedCopy>);

  const copy = page.getByText('Nothing is waiting on your take right now.').element();
  expect(copy.tagName).toBe('P');
  expect(copy.className).toContain('text-muted-foreground');
  expect(copy.getAttribute('data-slot')).toBe('muted-copy');
});

test('size="xs" is the compact caption', async () => {
  await render(<MutedCopy size="xs">Saved just now.</MutedCopy>);

  const copy = page.getByText('Saved just now.').element();
  expect(copy.className).toContain('text-xs');
  expect(copy.className).toContain('leading-5');
  expect(copy.className).toContain('text-muted-foreground');
  expect(copy.className).not.toContain('text-sm');
});

test('className layout classes are appended', async () => {
  await render(<MutedCopy className="mt-1">Layout</MutedCopy>);

  expect(page.getByText('Layout').element().className).toContain('mt-1');
});

test('as renders a span or div where a paragraph would be invalid', async () => {
  await render(
    <>
      <MutedCopy as="span">Inline</MutedCopy>
      <MutedCopy as="div" size="xs">
        Block
      </MutedCopy>
    </>
  );

  const inline = page.getByText('Inline').element();
  expect(inline.tagName).toBe('SPAN');
  expect(inline.getAttribute('data-slot')).toBe('muted-copy');
  const block = page.getByText('Block').element();
  expect(block.tagName).toBe('DIV');
  expect(block.className).toContain('text-xs');
});
