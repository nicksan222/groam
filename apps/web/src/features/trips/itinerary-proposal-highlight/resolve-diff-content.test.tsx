import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResolutionMedia } from '@/features/trips/hooks/detail-resolution-values';
import { ResolveDiffContent } from './resolve-diff-content';

function makeFile(overrides: Partial<ResolutionMedia> = {}): ResolutionMedia {
  return {
    contentType: 'application/pdf',
    id: 'file-1',
    name: 'tickets.pdf',
    size: 2048,
    url: 'https://files.example/tickets.pdf',
    ...overrides
  };
}

describe('text values', () => {
  test.each([
    ['removed', '−'],
    ['added', '+']
  ] as const)('marks %s lines with %s', async (tone, marker) => {
    await render(<ResolveDiffContent files={[]} media={false} tone={tone} value="Day one" />);
    await expect.element(page.getByText('Day one')).toBeVisible();
    await expect.element(page.getByText(marker)).toBeInTheDocument();
  });

  test('renders each line of a multi-line value', async () => {
    await render(
      <ResolveDiffContent files={[]} media={false} value={'Total days: 5\nIdeal days: 4'} />
    );
    await expect.element(page.getByText('Total days: 5')).toBeVisible();
    await expect.element(page.getByText('Ideal days: 4')).toBeVisible();
  });
});

describe('media values', () => {
  test('says when there are no files', async () => {
    await render(<ResolveDiffContent files={[]} media value="" />);
    await expect.element(page.getByText('No files')).toBeVisible();
  });

  test('links a document with its size', async () => {
    await render(<ResolveDiffContent files={[makeFile()]} media value="" />);
    await expect
      .element(page.getByRole('link', { name: 'tickets.pdf' }))
      .toHaveAttribute('href', 'https://files.example/tickets.pdf');
    await expect.element(page.getByText('2.0 KB')).toBeVisible();
  });

  test('flags a file without a preview url', async () => {
    await render(<ResolveDiffContent files={[makeFile({ size: 0, url: null })]} media value="" />);
    await expect.element(page.getByText(/Preview unavailable/)).toBeVisible();
  });

  test('shows an image preview for image files with a url', async () => {
    await render(
      <ResolveDiffContent
        files={[
          makeFile({
            contentType: 'image/png',
            name: 'beach.png',
            url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
          })
        ]}
        media
        value=""
      />
    );
    await expect.element(page.getByRole('img', { name: 'beach.png' })).toBeInTheDocument();
  });
});
