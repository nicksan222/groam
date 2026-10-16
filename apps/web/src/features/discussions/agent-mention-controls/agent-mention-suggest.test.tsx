import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentMentionSuggest } from './agent-mention-suggest';

function makeApi(overrides: Partial<MessageComposerApi> = {}): MessageComposerApi {
  return { insertText: vi.fn(), isSubmitting: false, setText: vi.fn(), text: '', ...overrides };
}

describe('AgentMentionSuggest', () => {
  test.each([
    ['no at-sign', 'hello'],
    ['a non-matching query', 'hey @bob'],
    ['an existing mention', '@groam hi @']
  ])('renders nothing for %s', async (_, text) => {
    await render(<AgentMentionSuggest api={makeApi({ text })} />);
    await expect.element(page.getByRole('button', { name: /@groam/ })).not.toBeInTheDocument();
  });

  test.each([
    ['a bare at-sign', '@'],
    ['a partial handle', 'ask @gro']
  ])('suggests Groam for %s and completes it on select', async (_, text) => {
    const api = makeApi({ text });
    await render(<AgentMentionSuggest api={api} />);
    await expect.element(page.getByText('Ask Groam — reply visible to everyone')).toBeVisible();
    await page.getByRole('button', { name: /@groam/ }).click();
    expect(api.setText).toHaveBeenCalledWith(text.replace(/@\w*$/, '@groam '));
  });

  test.each([
    ['disabled', { disabled: true }, {}],
    ['submitting', {}, { isSubmitting: true }]
  ])('disables the suggestion while %s', async (_, props, apiOverrides) => {
    await render(<AgentMentionSuggest api={makeApi({ text: '@', ...apiOverrides })} {...props} />);
    await expect.element(page.getByRole('button', { name: /@groam/ })).toBeDisabled();
  });
});
