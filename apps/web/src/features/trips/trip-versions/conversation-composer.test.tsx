import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ConversationComposer } from './conversation-composer';

function setup(overrides: Partial<Parameters<typeof ConversationComposer>[0]> = {}) {
  const props = {
    disabled: false,
    onSubmit: vi.fn(async () => true),
    ...overrides
  };
  return props;
}

describe('ConversationComposer', () => {
  test('submits a comment and a change request with the typed text', async () => {
    const props = setup();
    await render(<ConversationComposer {...props} />);
    const box = page.getByLabelText('Leave a comment');
    await box.fill('Looks good');
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect.poll(() => vi.mocked(props.onSubmit).mock.calls.length).toBe(1);
    await box.fill('Please change lunch');
    await page.getByRole('button', { name: 'Request changes' }).click();
    await expect
      .poll(() => vi.mocked(props.onSubmit).mock.calls)
      .toEqual([
        ['comment', 'Looks good'],
        ['change_request', 'Please change lunch']
      ]);
  });

  test('keeps the text when the save fails', async () => {
    const props = setup({ onSubmit: vi.fn(async () => false) });
    await render(<ConversationComposer {...props} />);
    const box = page.getByLabelText('Leave a comment');
    await box.fill('Keep me');
    await page.getByRole('button', { name: 'Comment' }).click();
    await expect.element(box).toHaveTextContent('Keep me');
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  test('Mod+Enter leaves a comment, not a change request', async () => {
    const props = setup();
    await render(<ConversationComposer {...props} />);
    await page.getByLabelText('Leave a comment').fill('Quick note');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    await expect
      .poll(() => vi.mocked(props.onSubmit).mock.calls)
      .toEqual([['comment', 'Quick note']]);
  });

  test('disables both buttons while empty', async () => {
    await render(<ConversationComposer {...setup()} />);
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Request changes' })).toBeDisabled();
  });

  test('disables both buttons when disabled', async () => {
    await render(<ConversationComposer {...setup({ disabled: true })} />);
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Request changes' })).toBeDisabled();
  });
});
