import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AskGroamButton } from './ask-groam-button';

function makeApi(overrides: Partial<MessageComposerApi> = {}): MessageComposerApi {
  return { insertText: vi.fn(), isSubmitting: false, setText: vi.fn(), text: '', ...overrides };
}

describe('AskGroamButton', () => {
  test.each([
    ['empty text', '', '@groam '],
    ['existing text', 'dinner ideas ', 'dinner ideas @groam ']
  ])('inserts the mention into %s', async (_, text, expected) => {
    const api = makeApi({ text });
    await render(<AskGroamButton api={api} />);
    const button = page.getByRole('button', { name: 'Ask Groam' });
    await expect.element(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    expect(api.setText).toHaveBeenCalledWith(expected);
  });

  test('is pressed and disabled once Groam is tagged', async () => {
    await render(<AskGroamButton api={makeApi({ text: 'hi @groam' })} />);
    const button = page.getByRole('button', { name: 'Groam already tagged' });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
  });

  test.each([
    ['disabled', { disabled: true }, {}],
    ['submitting', {}, { isSubmitting: true }]
  ])('is disabled while %s', async (_, props, apiOverrides) => {
    await render(<AskGroamButton api={makeApi(apiOverrides)} {...props} />);
    await expect.element(page.getByRole('button', { name: 'Ask Groam' })).toBeDisabled();
  });
});
