import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { Markdown } from './markdown';

test('renders headings, emphasis, lists, and links', async () => {
  await render(
    <Markdown>
      {'## Hotels\n\n**Monti** is close.\n\n- Quiet\n- Cheap\n\n[Book](https://hotel.example)'}
    </Markdown>
  );
  await expect.element(page.getByRole('heading', { name: 'Hotels' })).toBeVisible();
  await expect.element(page.getByText('Monti')).toBeVisible();
  expect(page.getByRole('listitem').elements()).toHaveLength(2);
  const link = page.getByRole('link', { name: 'Book' }).element();
  expect(link.getAttribute('href')).toBe('https://hotel.example/');
  expect(link.getAttribute('target')).toBe('_blank');
});

test('renders GFM tables', async () => {
  await render(<Markdown>{'| City | Nights |\n| --- | --- |\n| Rome | 3 |'}</Markdown>);
  await expect.element(page.getByRole('cell', { name: 'Rome' })).toBeVisible();
});

test('keeps HTML-looking source titles as link text instead of rendering empty tables', async () => {
  await render(<Markdown>{'1. [<table id="e1">](<https://example.com/source.pdf>)'}</Markdown>);
  await expect
    .element(page.getByRole('link', { name: '<table id="e1">' }))
    .toHaveAttribute('href', 'https://example.com/source.pdf');
  expect(page.getByRole('table').elements()).toHaveLength(0);
});

test('allows document tables to grow without a nested vertical scroll limit', async () => {
  await render(
    <Markdown tableMaxHeight="none">{'| City | Nights |\n| --- | --- |\n| Rome | 3 |'}</Markdown>
  );
  const table = page.getByRole('table').element();
  expect(getComputedStyle(table.parentElement!).maxHeight).toBe('none');
});

test('keeps half-streamed syntax tidy', async () => {
  await render(<Markdown streaming>{'Pick **Monti'}</Markdown>);
  await expect.element(page.getByText('Monti')).toBeVisible();
  await expect.element(page.getByText('**', { exact: false })).not.toBeInTheDocument();
});
