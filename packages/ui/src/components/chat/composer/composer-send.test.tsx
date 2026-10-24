import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import {
  Composer,
  ComposerActionGroup,
  ComposerActions,
  ComposerInput,
  type ComposerValue
} from './composer';
import { ComposerSend } from './composer-send';
import { ComposerStop } from './composer-stop';

function Harness({
  defaultText,
  disabled,
  onStop,
  onSubmit,
  pending = false,
  stopping,
  submitDisabled
}: {
  defaultText?: string;
  disabled?: boolean;
  onStop?: () => void;
  onSubmit: (value: ComposerValue) => void;
  pending?: boolean;
  stopping?: boolean;
  submitDisabled?: boolean;
}) {
  const [value, setValue] = useState<ComposerValue>(
    defaultText ? [{ text: defaultText, type: 'text' }] : []
  );
  return (
    <Composer
      aria-label="Message"
      disabled={disabled}
      onSubmit={onSubmit}
      onValueChange={setValue}
      submitDisabled={submitDisabled}
      value={value}
    >
      <ComposerInput aria-label="Message" />
      <ComposerActions>
        <ComposerActionGroup align="end">
          {onStop ? <ComposerStop label="Stop reply" onStop={onStop} stopping={stopping} /> : null}
          <ComposerSend pending={pending} testId="send" />
        </ComposerActionGroup>
      </ComposerActions>
    </Composer>
  );
}

const textbox = () => page.getByRole('textbox', { name: 'Message' });
const send = () => page.getByRole('button', { name: 'Send message' });

test('sends only a non-empty draft through the composer', async () => {
  const onSubmit = vi.fn();
  await render(<Harness onSubmit={onSubmit} />);
  await expect.element(send()).toBeDisabled();
  await expect.element(page.getByTestId('send')).toHaveAccessibleName('Send message');
  await textbox().fill('Hello');
  await expect.element(send()).toBeEnabled();
  await send().click();
  expect(onSubmit).toHaveBeenCalledWith([{ text: 'Hello', type: 'text' }]);
});

test.each([
  ['submitDisabled', { submitDisabled: true }],
  ['disabled', { disabled: true }]
])('follows the composer %s policy', async (_label, props) => {
  const onSubmit = vi.fn();
  await render(<Harness defaultText="Hello" onSubmit={onSubmit} {...props} />);
  await expect.element(send()).toBeDisabled();
  textbox().element().focus();
  await userEvent.keyboard('{Enter}');
  expect(onSubmit).not.toHaveBeenCalled();
});

test('marks a pending send as busy', async () => {
  await render(<Harness onSubmit={vi.fn()} pending />);
  await expect.element(send()).toHaveAttribute('aria-busy', 'true');
  await expect.element(send()).toHaveAttribute('data-pending', '');
});

test('names the send button with a tooltip on hover', async () => {
  await render(<Harness defaultText="Hello" onSubmit={vi.fn()} />);
  await send().hover();
  await expect.element(page.getByText('Send message', { exact: true })).toBeVisible();
});

test('stops without submitting the draft', async () => {
  const onStop = vi.fn();
  const onSubmit = vi.fn();
  await render(<Harness onStop={onStop} onSubmit={onSubmit} />);
  await textbox().fill('Keep this');
  await page.getByRole('button', { name: 'Stop reply' }).click();
  expect(onStop).toHaveBeenCalledOnce();
  expect(onSubmit).not.toHaveBeenCalled();
  await expect.element(textbox()).toHaveTextContent('Keep this');
});

test('disables stop while stopping', async () => {
  await render(<Harness onStop={vi.fn()} onSubmit={vi.fn()} stopping />);
  const stop = page.getByRole('button', { name: 'Stop reply' });
  await expect.element(stop).toBeDisabled();
  await expect.element(stop).toHaveAttribute('aria-busy', 'true');
});

test('shows the stop label as text when asked', async () => {
  const onStop = vi.fn();
  await render(<ComposerStop label="Stop Groam" onStop={onStop} showLabel />);
  const stop = page.getByRole('button', { name: 'Stop Groam' });
  await expect.element(stop).toHaveTextContent('Stop Groam');
  await stop.click();
  expect(onStop).toHaveBeenCalledOnce();
});
