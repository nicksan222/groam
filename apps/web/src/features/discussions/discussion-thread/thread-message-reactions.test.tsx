import { render } from '@groam/vitest-config/react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { ThreadMessageReactions } from './thread-message-reactions';
import type { ThreadReactionStamp } from './thread-message-stamps';

function makeStamp(overrides: Partial<ThreadReactionStamp> = {}): ThreadReactionStamp {
  return { count: 1, emoji: '👍', label: 'Agree', mine: false, ...overrides };
}

describe('ThreadMessageReactions', () => {
  test('renders nothing without reactions', async () => {
    await render(<ThreadMessageReactions mine={false} onReact={vi.fn()} stamps={[]} />);
    await expect.element(page.getByRole('button')).not.toBeInTheDocument();
  });

  test.each([
    ['a single reaction', makeStamp(), 'Agree'],
    ['multiple reactions', makeStamp({ count: 3 }), 'Agree, 3']
  ])('labels %s for assistive tech', async (_, stamp, name) => {
    await render(<ThreadMessageReactions mine={false} onReact={vi.fn()} stamps={[stamp]} />);
    await expect.element(page.getByRole('button', { name })).toBeVisible();
  });

  test.each([
    ['viewer reacted', true, 'true'],
    ['viewer has not reacted', false, 'false']
  ])('exposes pressed state when %s', async (_, mine, pressed) => {
    await render(
      <ThreadMessageReactions mine={false} onReact={vi.fn()} stamps={[makeStamp({ mine })]} />
    );
    await expect
      .element(page.getByRole('button', { name: 'Agree' }))
      .toHaveAttribute('aria-pressed', pressed);
  });

  test('reports the clicked emoji', async () => {
    const onReact = vi.fn();
    await render(
      <ThreadMessageReactions
        mine
        onReact={onReact}
        stamps={[makeStamp(), makeStamp({ emoji: '🎉', label: "Let's go" })]}
      />
    );
    await page.getByRole('button', { name: "Let's go" }).click();
    expect(onReact).toHaveBeenCalledWith('🎉');
  });
});
