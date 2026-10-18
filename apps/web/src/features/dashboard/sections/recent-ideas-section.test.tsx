import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { RecentIdeasSection } from './recent-ideas-section';

function snapshot(overrides: Partial<Parameters<typeof RecentIdeasSection>[0]['snapshot']> = {}) {
  return { conflicts: 0, decided: 0, drafts: 0, inReview: 0, total: 0, ...overrides };
}

describe('RecentIdeasSection', () => {
  test('renders nothing without ideas', async () => {
    await render(<RecentIdeasSection snapshot={snapshot()} />);
    await expect.element(page.getByText('Recent ideas')).not.toBeInTheDocument();
  });

  test.each([
    [1, 'idea'],
    [5, 'ideas']
  ])('pluralizes %i recent idea(s)', async (total, noun) => {
    await render(<RecentIdeasSection snapshot={snapshot({ drafts: total, total })} />);
    await expect
      .element(page.getByText(`Based on the ${total} most recent ${noun}.`))
      .toBeVisible();
  });

  test('lists a count for every status', async () => {
    await render(
      <RecentIdeasSection
        snapshot={snapshot({ conflicts: 1, decided: 4, drafts: 2, inReview: 3, total: 10 })}
      />
    );
    const items = page.getByRole('list', { name: 'Recent idea status values' });
    await expect.element(items.getByRole('listitem').nth(0)).toHaveTextContent('Drafts2');
    await expect.element(items.getByRole('listitem').nth(1)).toHaveTextContent('In review3');
    await expect.element(items.getByRole('listitem').nth(2)).toHaveTextContent('Resolve changes1');
    await expect.element(items.getByRole('listitem').nth(3)).toHaveTextContent('Decided4');
  });

  test('draws a bar segment only for statuses that have ideas', async () => {
    await render(<RecentIdeasSection snapshot={snapshot({ decided: 1, drafts: 3, total: 4 })} />);
    const bar = page.getByRole('img', { name: 'Recent idea status distribution' });
    const segments = Array.from(bar.element().children) as HTMLElement[];
    expect(segments.map((segment) => segment.style.width)).toEqual(['75%', '25%']);
  });
});
