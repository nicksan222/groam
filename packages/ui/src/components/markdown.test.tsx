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

test('keeps half-streamed syntax tidy', async () => {
  await render(<Markdown streaming>{'Pick **Monti'}</Markdown>);
  await expect.element(page.getByText('Monti')).toBeVisible();
  await expect.element(page.getByText('**', { exact: false })).not.toBeInTheDocument();
});
