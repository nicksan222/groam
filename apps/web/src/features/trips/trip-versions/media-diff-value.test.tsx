import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { MediaDiffValue } from './media-diff-value';
import type { VisualDiffField } from './proposal-types';

type Media = VisualDiffField['mediaAfter'];

const item = (overrides: Record<string, unknown>) =>
  ({
    contentType: 'application/pdf',
    id: 'm1',
    name: 'ticket.pdf',
    size: 500,
    url: 'https://example.com/ticket.pdf',
    ...overrides
  }) as unknown as Media[number];

describe('MediaDiffValue', () => {
  test('shows None when empty', async () => {
    await render(<MediaDiffValue media={[]} />);
    await expect.element(page.getByText('None')).toBeVisible();
  });

  test.each([
    [500, '500 B'],
    [2048, '2.0 KB'],
    [3 * 1024 * 1024, '3.0 MB']
  ])('formats a %s byte file as %s', async (size, label) => {
    await render(<MediaDiffValue media={[item({ size })]} />);
    await expect.element(page.getByText(label)).toBeVisible();
  });

  test('links to the file', async () => {
    await render(<MediaDiffValue media={[item({})]} />);
    await expect
      .element(page.getByRole('link', { name: /ticket\.pdf/ }))
      .toHaveAttribute('href', 'https://example.com/ticket.pdf');
  });

  test.each([
    ['image/png', 'photo.png', true],
    ['video/mp4', 'clip.mp4', false],
    ['audio/mpeg', 'song.mp3', false]
  ])('renders %s media', async (contentType, name, hasImage) => {
    await render(
      <MediaDiffValue
        media={[item({ contentType, name, url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' })]}
      />
    );
    await expect.element(page.getByText(name)).toBeVisible();
    expect(document.querySelectorAll('img').length).toBe(hasImage ? 1 : 0);
  });
});
