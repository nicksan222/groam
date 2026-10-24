import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchSources } from './research-sources';
import { researchSources, researchSourceUrl } from './research-sources-utils';

const view = (texts: string[], loading = false) =>
  render(
    <ResearchSources loading={loading} sources={researchSources(texts.map((text) => ({ text })))} />
  );

test('extracts and deduplicates actual Markdown and plain URLs', () => {
  expect(
    researchSources([
      { text: '[Read more](https://EXAMPLE.com/guide#section). https://example.com/guide' },
      { text: 'https://example.org/Paris_(city) and <https://example.net/?q=hotels>.' },
      { text: '[Unsafe](javascript:alert(1)) https://user:secret@example.com/' }
    ])
  ).toEqual([
    { host: 'example.com', href: 'https://example.com/guide', path: '/guide' },
    { host: 'example.org', href: 'https://example.org/Paris_(city)', path: '/Paris_(city)' },
    { host: 'example.net', href: 'https://example.net/?q=hotels', path: '?q=hotels' }
  ]);
  expect(researchSourceUrl('javascript:alert(1)')).toBeNull();
  expect(researchSourceUrl('file:///tmp/trip')).toBeNull();
  expect(researchSourceUrl('example.com')).toBeNull();
});

test('shows real source hosts and paths as numbered safe external links', async () => {
  await view(['Try https://www.example.com/guide and https://www.example.com/guide']);
  const link = page.getByRole('link', { name: '1 example.com /guide Open source in a new tab' });
  await expect.element(link).toBeVisible();
  expect(link.element().getAttribute('href')).toBe('https://www.example.com/guide');
  expect(link.element().getAttribute('rel')).toBe('noopener noreferrer');
  expect(page.getByRole('link').all()).toHaveLength(1);
});

test('shows an honest empty state and a loading state', async () => {
  const screen = await view([]);
  await expect.element(page.getByText('No sources yet.', { exact: false })).toBeVisible();
  await screen.rerender(<ResearchSources loading sources={[]} />);
  await expect.element(page.getByText('Looking for source links…')).toBeVisible();
});

test('includes cited report sources and deduplicates them against notes', async () => {
  await view([
    'https://example.com/guide',
    '[Official](https://example.com/guide) [Museum](https://museum.example/visit)'
  ]);
  expect(page.getByRole('link').all()).toHaveLength(2);
  await expect
    .element(page.getByRole('link', { name: '2 museum.example /visit Open source in a new tab' }))
    .toBeVisible();
});

test('deduplicates citation tracking links without discarding meaningful query parameters', () => {
  expect(
    researchSources([
      {
        text: 'https://example.com/guide?q=hotels https://example.com/guide?q=hotels&utm_source=openai&utm_campaign=research https://example.com/guide?q=trains'
      }
    ])
  ).toEqual([
    { host: 'example.com', href: 'https://example.com/guide?q=hotels', path: '/guide?q=hotels' },
    { host: 'example.com', href: 'https://example.com/guide?q=trains', path: '/guide?q=trains' }
  ]);
});
