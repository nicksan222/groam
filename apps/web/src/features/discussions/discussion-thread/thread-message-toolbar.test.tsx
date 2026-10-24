import { render } from '@groam/vitest-config/react';
import { useViewport } from '@groam/vitest-config/viewport';
import { beforeEach, describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import type { ThreadReactionStamp } from './thread-message-stamps';
import { ThreadMessageToolbar } from './thread-message-toolbar';

const confirm = vi.hoisted(() => vi.fn());

vi.mock('@/features/workspace/workspace-shell/use-confirm-dialog', () => ({
  useConfirm: () => confirm
}));

const stamps: ThreadReactionStamp[] = [{ count: 1, emoji: '👍', label: 'Agree', mine: true }];

beforeEach(async () => {
  // Below the md breakpoint the toolbar is always visible; on desktop it appears on hover.
  await useViewport(390, 844);
  vi.clearAllMocks();
  confirm.mockResolvedValue(true);
});

describe('ThreadMessageToolbar', () => {
  test('without edit or remove handlers only reactions are offered', async () => {
    await render(<ThreadMessageToolbar mine={false} onReact={vi.fn()} stamps={[]} />);
    await expect.element(page.getByTestId(testIds.chatMessageReact)).toBeVisible();
    await expect.element(page.getByTestId(testIds.chatMessageMenu)).not.toBeInTheDocument();
  });

  test('picking a reaction reports it and closes the picker', async () => {
    const onReact = vi.fn();
    await render(<ThreadMessageToolbar mine onReact={onReact} stamps={[]} />);
    await page.getByTestId(testIds.chatMessageReact).click();
    await expect.element(page.getByLabelText('React to this message')).toBeVisible();
    await page.getByRole('button', { name: 'Love this' }).click();
    expect(onReact).toHaveBeenCalledWith('❤️');
    await expect.element(page.getByRole('button', { name: 'Love this' })).not.toBeInTheDocument();
  });

  test('marks reactions the viewer already used as pressed', async () => {
    await render(<ThreadMessageToolbar mine onReact={vi.fn()} stamps={stamps} />);
    await page.getByTestId(testIds.chatMessageReact).click();
    await expect
      .element(page.getByRole('button', { name: 'Agree' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByRole('button', { name: 'Agree' })).toBeVisible();
    await expect
      .element(page.getByRole('button', { name: "Let's go" }))
      .toHaveAttribute('aria-pressed', 'false');
  });

  test('lists edit and delete in the coss actions menu', async () => {
    await render(
      <ThreadMessageToolbar
        mine
        onEdit={vi.fn()}
        onReact={vi.fn()}
        onRemove={vi.fn()}
        stamps={[]}
      />
    );
    const trigger = page.getByTestId(testIds.chatMessageMenu);
    await expect.element(trigger).toHaveAccessibleName('Message actions');
    await trigger.click();
    await expect.element(page.getByRole('menu')).toBeVisible();
    await expect.element(page.getByRole('menuitem', { name: 'Edit' })).toBeVisible();
    await expect
      .element(page.getByRole('menuitem', { name: 'Delete' }))
      .toHaveAttribute('data-variant', 'destructive');
    await expect.element(page.getByRole('separator')).toBeInTheDocument();
    await expect.element(trigger).toHaveAttribute('data-popup-open');
  });

  test('edit calls onEdit', async () => {
    const onEdit = vi.fn();
    await render(<ThreadMessageToolbar mine onEdit={onEdit} onReact={vi.fn()} stamps={[]} />);
    await page.getByTestId(testIds.chatMessageMenu).click();
    await expect.element(page.getByTestId(testIds.chatMessageDelete)).not.toBeInTheDocument();
    await page.getByTestId(testIds.chatMessageEdit).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
    await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  });

  test('delete asks for confirmation before removing', async () => {
    const onRemove = vi.fn();
    await render(<ThreadMessageToolbar mine onReact={vi.fn()} onRemove={onRemove} stamps={[]} />);
    await page.getByTestId(testIds.chatMessageMenu).click();
    await expect.element(page.getByTestId(testIds.chatMessageEdit)).not.toBeInTheDocument();
    await page.getByTestId(testIds.chatMessageDelete).click();
    await expect.poll(() => onRemove.mock.calls.length).toBe(1);
    expect(confirm).toHaveBeenCalledWith(
      'Delete this message?',
      'It will be removed for everyone in this chat.'
    );
  });

  test('declining the confirmation keeps the message', async () => {
    confirm.mockResolvedValue(false);
    const onRemove = vi.fn();
    await render(<ThreadMessageToolbar mine onReact={vi.fn()} onRemove={onRemove} stamps={[]} />);
    await page.getByTestId(testIds.chatMessageMenu).click();
    await page.getByTestId(testIds.chatMessageDelete).click();
    await expect.poll(() => confirm.mock.calls.length).toBe(1);
    expect(onRemove).not.toHaveBeenCalled();
  });
});
