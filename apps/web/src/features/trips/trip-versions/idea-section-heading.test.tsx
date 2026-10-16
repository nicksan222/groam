import { render } from '@groam/vitest-config/react';
import { describe, expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IdeaSectionHeading } from './idea-section-heading';

describe('IdeaSectionHeading', () => {
  test('renders title and description', async () => {
    await render(<IdeaSectionHeading description="What changed" title="Changes" />);
    await expect.element(page.getByRole('heading', { name: 'Changes' })).toBeVisible();
    await expect.element(page.getByText('What changed')).toBeVisible();
  });

  test('renders optional icon, badge, id and class', async () => {
    await render(
      <IdeaSectionHeading
        badge={<span>3 open</span>}
        className="custom-heading"
        description="Desc"
        icon={<span>icon-slot</span>}
        title="Review"
        titleId="review-heading"
      />
    );
    await expect.element(page.getByText('icon-slot')).toBeVisible();
    await expect.element(page.getByText('3 open')).toBeVisible();
    expect(page.getByRole('heading', { name: 'Review' }).element().id).toBe('review-heading');
    expect(page.getByText('Desc').element().parentElement?.parentElement?.className).toContain(
      'custom-heading'
    );
  });
});
