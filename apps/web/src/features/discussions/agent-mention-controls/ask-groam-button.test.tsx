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
import { AskGroamButton } from './ask-groam-button';

function Harness({
  disabled,
  initial,
  onChange = () => {}
}: {
  disabled?: boolean;
  initial: string;
  onChange?: (value: ComposerValue) => void;
}) {
  const [value, setValue] = useState<ComposerValue>(
    initial ? [{ text: initial, type: 'text' }] : []
  );
  const update = (next: ComposerValue) => {
    setValue(next);
    onChange(next);
  };
  return (
    <Composer onValueChange={update} value={value}>
      <ComposerInput aria-label="Message" />
      <AskGroamButton disabled={disabled} onValueChange={update} />
    </Composer>
  );
}

describe('AskGroamButton', () => {
  test.each([
    ['an empty draft', '', '@groam '],
    ['existing text', 'dinner ideas', 'dinner ideas @groam ']
  ])('tags Groam in %s', async (_, initial, expected) => {
    const onChange = vi.fn();
    await render(<Harness initial={initial} onChange={onChange} />);
    const button = page.getByRole('button', { name: 'Ask Groam' });
    await expect.element(button).toHaveAttribute('aria-pressed', 'false');
    await button.click();
    expect(getComposerText(onChange.mock.calls.at(-1)?.[0] ?? [])).toBe(expected);
    await expect
      .element(page.getByRole('button', { name: 'Groam already tagged' }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  test('is pressed and disabled once Groam is tagged', async () => {
    await render(<Harness initial="hi @groam" />);
    const button = page.getByRole('button', { name: 'Groam already tagged' });
    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
  });

  test('is disabled when disabled', async () => {
    await render(<Harness disabled initial="" />);
    await expect.element(page.getByRole('button', { name: 'Ask Groam' })).toBeDisabled();
  });
});
