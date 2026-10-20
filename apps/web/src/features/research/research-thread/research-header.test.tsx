import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchDetail } from '@/types/research';
import { ResearchHeader } from './research-header';

vi.mock('@/features/workspace/navigation/router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/trips/t1/research">{children}</a>
}));

const detail = (partial: Partial<ResearchDetail> = {}): ResearchDetail => ({
  brief: 'Compare hotels',
  canManage: true,
  id: 'r1',
  links: [],
  shortId: 'r1',
  title: 'Hotels in Rome',
  tripId: 't1',
  ...partial
});

test('introduces the research topic with standard detail navigation', async () => {
  await render(<ResearchHeader research={detail()} />);
  await expect
    .element(page.getByRole('heading', { name: 'Hotels in Rome', level: 1 }))
    .toBeVisible();
  await expect.element(page.getByRole('link', { name: 'Trip research' })).toBeVisible();
  await expect.element(page.getByText('Compare hotels')).not.toBeInTheDocument();
});

test('keeps a long research title readable', async () => {
  await render(
    <ResearchHeader research={detail({ title: 'A very long subject '.repeat(8), brief: null })} />
  );
  await expect.element(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('keeps research views available without conversation navigation', async () => {
  const onViewChange = vi.fn();
  await render(
    <ResearchHeader activeView="notes" onViewChange={onViewChange} research={detail()} />
  );
  await expect.element(page.getByRole('navigation', { name: 'Research views' })).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Notes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  expect(onViewChange).toHaveBeenCalledWith('overview');
  await expect.element(page.getByRole('button', { name: 'Conversation' })).not.toBeInTheDocument();
});
