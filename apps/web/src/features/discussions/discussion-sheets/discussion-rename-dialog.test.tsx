import { render } from '@groam/vitest-config/react';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import type { DiscussionListItem } from '@/features/discussions/hooks/use-discussions';
import { testIds } from '@/lib/test-ids';
import { DiscussionRenameDialog } from './discussion-rename-dialog';

const renameDiscussion = vi.hoisted(() => vi.fn());

vi.mock('@/features/discussions/hooks/use-discussions', () => ({
  useRenameDiscussion: () => ({ renameDiscussion })
}));

const discussion = { id: 'discussion-1', title: 'Italy dates' } as unknown as DiscussionListItem;

beforeEach(() => {
  vi.clearAllMocks();
  renameDiscussion.mockResolvedValue(true);
});

describe('DiscussionRenameDialog', () => {
  test('starts with the current title', async () => {
    await render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open />);
    await expect.element(page.getByRole('heading', { name: 'Rename chat' })).toBeVisible();
    await expect.element(page.getByTestId(testIds.chatRenameTitle)).toHaveValue('Italy dates');
  });

  test('renders nothing while closed', async () => {
    await render(<DiscussionRenameDialog discussion={discussion} onClose={vi.fn()} open={false} />);
    await expect.element(page.getByTestId(testIds.chatRenameDialog)).not.toBeInTheDocument();
  });

  test('saves the trimmed name and closes', async () => {
    const onClose = vi.fn();
    await render(<DiscussionRenameDialog discussion={discussion} onClose={onClose} open />);
    await page.getByTestId(testIds.chatRenameTitle).fill('  Rome plans  ');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.poll(() => renameDiscussion.mock.calls.length).toBe(1);
    expect(renameDiscussion).toHaveBeenCalledWith('discussion-1', 'Rome plans');
    await expect.poll(() => onClose.mock.calls.length).toBe(1);
  });

  test('disables saving a blank name', async () => {
    const onClose = vi.fn();
    await render(<DiscussionRenameDialog discussion={discussion} onClose={onClose} open />);
    await page.getByTestId(testIds.chatRenameTitle).fill('   ');
    await expect.element(page.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    expect(renameDiscussion).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('keeps the dialog open and shows an error when the rename fails', async () => {
    renameDiscussion.mockResolvedValue(false);
    const onClose = vi.fn();
    await render(<DiscussionRenameDialog discussion={discussion} onClose={onClose} open />);
    await page.getByTestId(testIds.chatRenameTitle).fill('New name');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect.element(page.getByText('Unable to rename this chat')).toBeVisible();
    expect(onClose).not.toHaveBeenCalled();
  });
});
