import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchLink } from '@/types/research';
import { ResearchLinkEvent } from './research-link-event';

const link: ResearchLink = {
  createdAt: 1,
  createdByName: 'Ada',
  href: null,
  id: 'l1',
  label: 'Book flights',
  target: { id: 'i1', kind: 'issue' }
};

test('says who linked what and opens or removes it', async () => {
  const onOpen = vi.fn();
  const onRemove = vi.fn();
  await render(<ResearchLinkEvent link={link} onOpen={onOpen} onRemove={onRemove} />);
  await expect.element(page.getByText('Ada linked issue')).toBeVisible();
  await page.getByRole('button', { name: 'Book flights' }).click();
  expect(onOpen).toHaveBeenCalledWith(link);
  await page.getByRole('button', { name: 'Remove link Book flights' }).click();
  expect(onRemove).toHaveBeenCalledWith(link);
});

test('is read-only without handlers', async () => {
  await render(<ResearchLinkEvent link={link} />);
  await expect.element(page.getByText('Book flights')).toBeVisible();
  await expect.element(page.getByRole('button')).not.toBeInTheDocument();
});
