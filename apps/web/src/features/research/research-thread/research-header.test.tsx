import { render } from '@groam/vitest-config/react';
import { expect, test } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchDetail } from '@/types/research';
import { ResearchHeader } from './research-header';

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

test('renders title and brief without actions', async () => {
  await render(<ResearchHeader research={detail()} />);
  await expect.element(page.getByText('Hotels in Rome')).toBeVisible();
  await expect.element(page.getByText('Compare hotels')).toBeVisible();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});

test('omits the brief line when there is none', async () => {
  await render(<ResearchHeader research={detail({ brief: null })} />);
  await expect.element(page.getByRole('paragraph')).not.toBeInTheDocument();
});
