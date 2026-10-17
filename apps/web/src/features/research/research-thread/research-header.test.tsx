import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { LinkTargetOption, ResearchDetail } from '@/types/research';
import { ResearchHeader } from './research-header';

const detail = (partial: Partial<ResearchDetail> = {}): ResearchDetail => ({
  brief: 'Compare hotels',
  canManage: true,
  id: 'r1',
  links: [{ href: null, id: 'l1', label: 'Book flights', target: { id: 'i1', kind: 'issue' } }],
  shortId: 'r1',
  title: 'Hotels in Rome',
  tripId: 't1',
  ...partial
});

const options: LinkTargetOption[] = [
  { group: 'Ideas', label: 'Pisa trip', target: { id: 'd1', kind: 'idea' } }
];

function setup(research: ResearchDetail) {
  const handlers = {
    onAddLink: vi.fn(),
    onRemoveLink: vi.fn(),
    onSaveBrief: vi.fn(),
    onSummarize: vi.fn()
  };
  const view = render(<ResearchHeader linkOptions={options} research={research} {...handlers} />);
  return { handlers, view };
}

test('renders title, brief, and link chips', async () => {
  await setup(detail()).view;
  await expect.element(page.getByText('Hotels in Rome')).toBeVisible();
  await expect.element(page.getByText('Compare hotels')).toBeVisible();
  await expect.element(page.getByText('Book flights')).toBeVisible();
});

test('summarize fires its callback', async () => {
  const { handlers, view } = setup(detail());
  await view;
  await page.getByTestId(testIds.researchSummarize).click();
  expect(handlers.onSummarize).toHaveBeenCalledOnce();
});

test('edits the brief when the viewer can manage', async () => {
  const { handlers, view } = setup(detail());
  await view;
  await page.getByRole('button', { name: 'Edit brief' }).click();
  await page.getByTestId(testIds.researchBriefInput).fill(' New brief ');
  await page.getByTestId(testIds.researchBriefSave).click();
  expect(handlers.onSaveBrief).toHaveBeenCalledWith('New brief');
});

test('hides brief editing without manage access', async () => {
  await setup(detail({ canManage: false })).view;
  await expect.element(page.getByRole('button', { name: 'Edit brief' })).not.toBeInTheDocument();
});

test('removes a link and adds one through the picker', async () => {
  const { handlers, view } = setup(detail());
  await view;
  await page.getByRole('button', { name: 'Remove link Book flights' }).click();
  expect(handlers.onRemoveLink).toHaveBeenCalledWith(detail().links[0]);
  await page.getByTestId(testIds.linkTargetPicker).click();
  await page.getByRole('button', { name: 'Pisa trip' }).click();
  expect(handlers.onAddLink).toHaveBeenCalledWith(options[0]);
});
