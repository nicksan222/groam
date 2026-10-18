import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { IssueLabelMarks } from './issue-label-marks';

test('shows a chip for each label', async () => {
  await render(<IssueLabelMarks labels={['mandatory']} />);
  await expect.element(page.getByText('Mandatory')).toBeVisible();
});

test('renders nothing without labels', async () => {
  const { container } = await render(<IssueLabelMarks labels={[]} />);
  expect(container.textContent).toBe('');
});
