import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { ResearchDetail } from '@/types/research';
import { ResearchBrief } from './research-brief';
import { ResearchLinkedItems } from './research-linked-items';

const onSaveBrief = vi.fn<(brief: string) => Promise<boolean>>();
const onLink = vi.fn<() => Promise<boolean>>();
const onUnlink = vi.fn<() => Promise<boolean>>();
const onOpen = vi.fn();
const linkedIssue = {
  createdAt: 1,
  createdByName: 'Ada',
  href: '/issues/issue1',
  id: 'link1',
  label: 'Find a quiet hotel',
  target: { id: 'issue1', kind: 'issue' as const }
};
const research: ResearchDetail = {
  brief: 'Compare **walkable** neighborhoods.\n\nPrioritize a quiet room.',
  canManage: true,
  id: 'r1',
  links: [linkedIssue],
  shortId: 'research1',
  title: 'Where to stay',
  tripId: 'trip1'
};

beforeEach(() => {
  vi.clearAllMocks();
  onSaveBrief.mockResolvedValue(true);
  onLink.mockResolvedValue(true);
  onUnlink.mockResolvedValue(true);
});

const view = (overrides: Partial<ResearchDetail> = {}, writable = true) =>
  render(
    <>
      <ResearchBrief
        brief={{ ...research, ...overrides }.brief}
        canEdit={{ ...research, ...overrides }.canManage && writable}
        onSave={onSaveBrief}
      />
      <ResearchLinkedItems
        onLink={onLink}
        onOpen={onOpen}
        onUnlink={onUnlink}
        options={[
          { group: 'Ideas', label: 'Stay in Prati', target: { id: 'idea1', kind: 'idea' } }
        ]}
        links={{ ...research, ...overrides }.links}
        writable={writable}
      />
    </>
  );

test('shows the full brief and persistent named trip links', async () => {
  await view();
  await expect.element(page.getByText('Prioritize a quiet room.')).toBeVisible();
  await expect.element(page.getByText('Issue', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Find a quiet hotel', exact: true }).click();
  expect(onOpen).toHaveBeenCalledWith(linkedIssue);
  expect(onLink).not.toHaveBeenCalled();
  expect(onSaveBrief).not.toHaveBeenCalled();
});

test('keeps edits after a failed save, then closes only when saved', async () => {
  onSaveBrief.mockResolvedValueOnce(false);
  await view();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Research brief' }).fill('Compare transit connections.');
  await page.getByRole('button', { name: 'Save brief' }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research brief' }))
    .toHaveValue('Compare transit connections.');
  await page.getByRole('button', { name: 'Save brief' }).click();
  await expect
    .element(page.getByRole('textbox', { name: 'Research brief' }))
    .not.toBeInTheDocument();
  expect(onSaveBrief).toHaveBeenCalledTimes(2);
  expect(onSaveBrief).toHaveBeenLastCalledWith('Compare transit connections.');
});

test('disables the editor and cancel while saving', async () => {
  let finish: (success: boolean) => void = () => undefined;
  onSaveBrief.mockReturnValue(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    })
  );
  await view();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: 'Save brief' }).click();
  await expect.element(page.getByRole('textbox', { name: 'Research brief' })).toBeDisabled();
  await expect.element(page.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  finish(true);
  await expect.element(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
});

test('requires Add after selecting a link and supports unlinking', async () => {
  await view();
  await expect.element(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Trip item to link' }).click();
  await page.getByRole('option', { name: 'Idea · Stay in Prati' }).click();
  expect(onLink).not.toHaveBeenCalled();
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  expect(onLink).toHaveBeenCalledWith({ id: 'idea1', kind: 'idea' });
  await expect.element(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Unlink Find a quiet hotel' }).click();
  expect(onUnlink).toHaveBeenCalledWith(linkedIssue.target);
});

test('shows useful empty guidance and lets a manager start a brief', async () => {
  await view({ brief: null, links: [] });
  await expect.element(page.getByText('Define the question', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('textbox', { name: 'Research brief' }).fill('A new question');
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(onSaveBrief).not.toHaveBeenCalled();
});

test('members cannot edit the brief, and archived research has no mutation controls', async () => {
  const { unmount } = await view({ canManage: false });
  await expect
    .element(page.getByRole('button', { name: 'Edit', exact: true }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole('combobox', { name: 'Trip item to link' })).toBeVisible();
  await unmount();
  await view({}, false);
  await expect
    .element(page.getByRole('button', { name: 'Edit', exact: true }))
    .not.toBeInTheDocument();
  await expect.element(page.getByRole('combobox')).not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Unlink Find a quiet hotel' }))
    .not.toBeInTheDocument();
  await expect
    .element(page.getByRole('button', { name: 'Find a quiet hotel', exact: true }))
    .toBeVisible();
});
