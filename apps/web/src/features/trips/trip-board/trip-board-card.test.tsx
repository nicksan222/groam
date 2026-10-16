import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { TripBoardCard } from './trip-board-card';

describe('TripBoardCard', () => {
  test('renders the title as a level three heading inside an article', async () => {
    await render(<TripBoardCard title="Coast day" />);
    await expect.element(page.getByRole('article')).toBeVisible();
    await expect.element(page.getByRole('heading', { level: 3, name: 'Coast day' })).toBeVisible();
  });

  test.each([
    ['an aside', { aside: <span>Status chip</span> }, 'Status chip', true],
    ['no aside', {}, 'Status chip', false],
    ['a description', { description: 'Muted text' }, 'Muted text', true],
    ['no description', { description: null }, 'Muted text', false],
    ['chips', { chips: <span>Chip one</span> }, 'Chip one', true],
    ['no chips', {}, 'Chip one', false]
  ])('with %s shows the optional text: %s', async (_, props, text, visible) => {
    await render(<TripBoardCard title="Coast day" {...props} />);
    const element = page.getByText(text, { exact: true });
    if (visible) await expect.element(element).toBeVisible();
    else await expect.element(element).not.toBeInTheDocument();
  });

  test('passes extra attributes and a class to the article', async () => {
    await render(<TripBoardCard className="extra" data-testid="card" title="Coast day" />);
    await expect.element(page.getByTestId('card')).toHaveClass('extra');
  });
});
