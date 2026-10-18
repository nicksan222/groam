import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { IdeaEmptyState } from './idea-empty-state';

describe('IdeaEmptyState', () => {
  test('explains ideas', async () => {
    await render(<IdeaEmptyState canStart={false} />);
    await expect.element(page.getByText('Start an idea')).toBeVisible();
    await expect
      .element(
        page.getByText('Your edits stay in an idea until the group reviews and applies them.')
      )
      .toBeVisible();
  });

  test('names the original trip in the explainer', async () => {
    await render(<IdeaEmptyState canStart={false} originalName="Atlantic week" />);
    await expect.element(page.getByText('Atlantic week')).toBeVisible();
  });

  test('starts an idea', async () => {
    const onStart = vi.fn();
    await render(<IdeaEmptyState canStart onStart={onStart} />);
    await page.getByTestId(testIds.startIdea).click();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  test.each<[string, boolean, boolean]>([
    ['viewer cannot start', false, true],
    ['no start handler', true, false]
  ])('hides the start button when %s', async (_, canStart, hasHandler) => {
    await render(<IdeaEmptyState canStart={canStart} onStart={hasHandler ? vi.fn() : undefined} />);
    await expect.element(page.getByTestId(testIds.startIdea)).not.toBeInTheDocument();
  });
});
