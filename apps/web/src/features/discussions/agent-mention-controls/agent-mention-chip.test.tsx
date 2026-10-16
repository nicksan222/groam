import type { MessageComposerApi } from '@groam/ui/components/message-composer';
import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentMentionChip } from './agent-mention-chip';

function makeApi(overrides: Partial<MessageComposerApi> = {}): MessageComposerApi {
  return { insertText: vi.fn(), isSubmitting: false, setText: vi.fn(), text: '', ...overrides };
}

describe('AgentMentionChip', () => {
  test.each([
    ['empty text', ''],
    ['text without the mention', 'hello there'],
    ['a partial mention', '@gro']
  ])('renders nothing for %s', async (_, text) => {
    await render(<AgentMentionChip api={makeApi({ text })} />);
    await expect
      .element(page.getByRole('button', { name: 'Remove @groam' }))
      .not.toBeInTheDocument();
  });

  test('shows the chip and removes the mention from the text', async () => {
    const api = makeApi({ text: 'what should we eat @groam' });
    await render(<AgentMentionChip api={api} />);
    await expect.element(page.getByText('@groam')).toBeVisible();
    await page.getByRole('button', { name: 'Remove @groam' }).click();
    expect(api.setText).toHaveBeenCalledWith('what should we eat ');
  });

  test.each([
    ['disabled', { disabled: true }, {}],
    ['submitting', {}, { isSubmitting: true }]
  ])('disables removal while %s', async (_, props, apiOverrides) => {
    await render(
      <AgentMentionChip api={makeApi({ text: '@groam', ...apiOverrides })} {...props} />
    );
    await expect.element(page.getByRole('button', { name: 'Remove @groam' })).toBeDisabled();
  });
});
