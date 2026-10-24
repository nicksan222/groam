import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ResearchCurrentAnswer } from './research-current-answer';

const report = '### Recommendation\nKeep the plan flexible.\n\n[Guide](https://example.com/guide)';

test('pins the answer and keeps the full report one click away', async () => {
  await render(
    <ResearchCurrentAnswer answer="Keep the plan flexible." completedAt={1_000} report={report} />
  );
  await expect.element(page.getByRole('heading', { name: 'Current answer' })).toBeVisible();
  await expect.element(page.getByText('Keep the plan flexible.')).toBeVisible();
  await expect
    .element(page.getByRole('article', { name: 'Research report' }))
    .not.toBeInTheDocument();
  const toggle = page.getByRole('button', { name: 'Read full report' });
  await toggle.click();
  await expect.element(page.getByRole('link', { name: 'Guide' })).toBeVisible();
  await expect
    .element(page.getByRole('button', { name: 'Hide full report' }))
    .toHaveAttribute('aria-expanded', 'true');
});

test('falls back to the latest report when it has no recommendation', async () => {
  await render(<ResearchCurrentAnswer answer={null} completedAt={null} report="Findings" />);
  await expect.element(page.getByRole('heading', { name: 'Latest report' })).toBeVisible();
});
