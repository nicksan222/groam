import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ConversationComposer } from './conversation-composer';

function setup(overrides: Partial<Parameters<typeof ConversationComposer>[0]> = {}) {
  const props = {
    content: 'Looks good',
    disabled: false,
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    pending: false,
    ...overrides
  };
  return props;
}

describe('ConversationComposer', () => {
  test('submits a comment and a change request', async () => {
    const props = setup();
    await render(<ConversationComposer {...props} />);
    await page.getByRole('button', { name: 'Comment' }).click();
    await page.getByRole('button', { name: 'Request changes' }).click();
    expect(vi.mocked(props.onSubmit).mock.calls).toEqual([['comment'], ['change_request']]);
  });

  test('reports typed text', async () => {
    const props = setup({ content: '' });
    await render(<ConversationComposer {...props} />);
    await page.getByLabelText('Leave a comment').fill('Hi');
    expect(props.onChange).toHaveBeenCalledWith('Hi');
  });

  test.each([
    ['empty content', { content: '' }],
    ['whitespace content', { content: '   ' }],
    ['disabled', { disabled: true }]
  ])('disables both buttons for %s', async (_, overrides) => {
    await render(<ConversationComposer {...setup(overrides)} />);
    await expect.element(page.getByRole('button', { name: 'Comment' })).toBeDisabled();
    await expect.element(page.getByRole('button', { name: 'Request changes' })).toBeDisabled();
  });

  test('shows spinners while pending', async () => {
    await render(<ConversationComposer {...setup({ pending: true })} />);
    await expect.poll(() => page.getByRole('status').elements().length).toBe(2);
  });
});
