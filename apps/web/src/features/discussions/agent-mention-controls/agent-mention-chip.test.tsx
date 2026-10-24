import {
  Composer,
  ComposerInput,
  type ComposerValue,
  getComposerText
} from '@groam/ui/components/composer';
import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { AgentMentionChip } from './agent-mention-chip';

function Harness({
  disabled,
  initial,
  onChange = () => {}
}: {
  disabled?: boolean;
  initial: ComposerValue;
  onChange?: (value: ComposerValue) => void;
}) {
  const [value, setValue] = useState(initial);
  const update = (next: ComposerValue) => {
    setValue(next);
    onChange(next);
  };
  return (
    <Composer onValueChange={update} value={value}>
      <AgentMentionChip disabled={disabled} onValueChange={update} />
      <ComposerInput aria-label="Message" />
    </Composer>
  );
}

const text = (value: string): ComposerValue => (value ? [{ text: value, type: 'text' }] : []);
const token: ComposerValue = [
  { text: 'what should we eat ', type: 'text' },
  { id: 'groam', kind: 'agent', label: 'groam', trigger: '@', type: 'mention' }
];

describe('AgentMentionChip', () => {
  test.each([
    ['an empty draft', text('')],
    ['a draft without the mention', text('hello there')],
    ['a partial mention', text('@gro')]
  ])('renders nothing for %s', async (_, initial) => {
    await render(<Harness initial={initial} />);
    await expect
      .element(page.getByRole('button', { name: 'Remove @groam' }))
      .not.toBeInTheDocument();
  });

  test('removes the @groam token from the draft', async () => {
    const onChange = vi.fn();
    await render(<Harness initial={token} onChange={onChange} />);
    await page.getByRole('button', { name: 'Remove @groam' }).click();
    expect(getComposerText(onChange.mock.calls.at(-1)?.[0] ?? [])).toBe('what should we eat ');
    await expect
      .element(page.getByRole('button', { name: 'Remove @groam' }))
      .not.toBeInTheDocument();
  });

  test('disables removal when disabled', async () => {
    await render(<Harness disabled initial={text('@groam')} />);
    await expect.element(page.getByRole('button', { name: 'Remove @groam' })).toBeDisabled();
  });
});
