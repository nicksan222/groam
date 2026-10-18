import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { DiffFieldValue } from './diff-field-value';
import type { VisualDiffField } from './proposal-types';

function field(overrides: Record<string, unknown> = {}) {
  return {
    after: 'Sunset hike',
    before: 'Museum',
    display: 'text',
    format: 'text',
    key: 'name',
    label: 'Name',
    mediaAfter: [],
    mediaBefore: [],
    ...overrides
  } as unknown as VisualDiffField;
}

describe('DiffFieldValue', () => {
  test.each<['after' | 'before', string]>([
    ['before', 'Museum'],
    ['after', 'Sunset hike']
  ])('shows the %s text value', async (side, text) => {
    await render(<DiffFieldValue field={field()} side={side} />);
    await expect.element(page.getByText(text)).toBeVisible();
  });

  test('shows Not set for an empty side', async () => {
    await render(<DiffFieldValue field={field({ before: null })} side="before" />);
    await expect.element(page.getByText('Not set')).toBeVisible();
  });

  test.each<['after' | 'before', string]>([
    ['before', 'old.pdf'],
    ['after', 'new.pdf']
  ])('renders media on the %s side', async (side, name) => {
    const media = (fileName: string) => [
      { contentType: 'application/pdf', id: fileName, name: fileName, size: 2048, url: null }
    ];
    await render(
      <DiffFieldValue
        field={field({
          display: 'media',
          mediaAfter: media('new.pdf'),
          mediaBefore: media('old.pdf')
        })}
        side={side}
      />
    );
    await expect.element(page.getByText(name)).toBeVisible();
  });

  test('shows None for empty media', async () => {
    await render(<DiffFieldValue field={field({ display: 'media' })} side="after" />);
    await expect.element(page.getByText('None')).toBeVisible();
  });
});
