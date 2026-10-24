import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueLabelBadges } from './issue-label-badges';

test('shows a badge for each label', async () => {
  await render(<IssueLabelBadges labels={['mandatory']} />);
  await expect.element(page.getByText('Mandatory')).toBeVisible();
});

test('renders nothing without labels', async () => {
  const { container } = await render(<IssueLabelBadges labels={[]} />);
  expect(container.textContent).toBe('');
  expect(container.querySelector('div')).toBeNull();
});
