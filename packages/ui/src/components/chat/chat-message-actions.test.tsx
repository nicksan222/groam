import { render } from '@groam/vitest-config/react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ChatMessageActionToolbar } from './chat-message-actions';
import { ChatReactionPicker } from './chat-reaction-picker';
import { MenuItem, MenuSeparator } from './primitives/menu';

function Toolbar({
  onDelete = vi.fn(),
  onEdit = vi.fn(),
  onReact = vi.fn(),
  onReply = vi.fn()
}: {
  onDelete?: () => void;
  onEdit?: () => void;
  onReact?: (emoji: string) => void;
  onReply?: () => void;
}) {
  return (
    <ChatMessageActionToolbar
      menuChildren={
        <>
          <MenuItem data-testid="edit" onClick={onEdit}>
            Edit
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={onDelete} variant="destructive">
            Delete
          </MenuItem>
        </>
      }
      moreLabel="More actions"
      moreTestId="more"
      moreTooltip="More"
      onReply={onReply}
      reactionPicker={(toolbarRef) => (
        <ChatReactionPicker
          inToolbar
          onSelect={onReact}
          options={[{ emoji: '👍', label: 'Agree' }]}
          popupAnchor={toolbarRef}
          popupLabel="Choose a reaction"
          selectedEmojis={[]}
          triggerLabel="React"
          triggerTestId="react"
          triggerTooltip="React"
        />
      )}
      replyLabel="Reply to Ana"
      replyTestId="reply"
      replyTooltip="Reply"
      side="incoming"
      toolbarLabel="Message actions"
    />
  );
}

test('puts every action in one labelled toolbar with stable test hooks', async () => {
  await render(<Toolbar />);
  await expect.element(page.getByRole('toolbar', { name: 'Message actions' })).toBeInTheDocument();
  await expect.element(page.getByTestId('react')).toHaveAccessibleName('React');
  await expect.element(page.getByTestId('reply')).toHaveAccessibleName('Reply to Ana');
  await expect.element(page.getByTestId('more')).toHaveAccessibleName('More actions');
});

test('runs a menu item and closes the menu', async () => {
  const onEdit = vi.fn();
  await render(<Toolbar onEdit={onEdit} />);
  await page.getByTestId('more').click();
  await expect.element(page.getByRole('menu')).toBeVisible();
  await expect
    .element(page.getByRole('menuitem', { name: 'Delete' }))
    .toHaveAttribute('data-variant', 'destructive');
  await page.getByTestId('edit').click();
  expect(onEdit).toHaveBeenCalledOnce();
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
});

test('opens the menu from the keyboard and closes it with Escape', async () => {
  await render(<Toolbar />);
  await page.getByTestId('more').element().focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('menu')).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await expect.element(page.getByRole('menu')).not.toBeInTheDocument();
  await expect.element(page.getByTestId('more')).toHaveFocus();
});

test('replies and reacts from the toolbar', async () => {
  const onReply = vi.fn();
  const onReact = vi.fn();
  await render(<Toolbar onReact={onReact} onReply={onReply} />);
  await page.getByTestId('reply').click();
  expect(onReply).toHaveBeenCalledOnce();
  await page.getByTestId('react').click();
  await page.getByRole('button', { name: 'Agree' }).click();
  expect(onReact).toHaveBeenCalledWith('👍');
});

test('renders nothing without actions', async () => {
  const { container } = await render(
    <ChatMessageActionToolbar side="outgoing" toolbarLabel="Message actions" />
  );
  expect(container.querySelector('[data-slot="chat-message-action-toolbar"]')).toBeNull();
});
