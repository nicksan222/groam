import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { ChatComposer, type ChatComposerProps } from './chat-composer';

type Overrides = Partial<ChatComposerProps>;

function composerProps(overrides: Overrides = {}): ChatComposerProps {
  return {
    disabled: false,
    isResponding: false,
    label: 'Ask Groam',
    notice: 'Groam can make mistakes.',
    onSubmit: vi.fn().mockResolvedValue(true),
    placeholder: 'Ask anything',
    ...overrides
  };
}

const textbox = () => page.getByRole('textbox', { name: 'Ask Groam' });

test('submits the trimmed message on Enter and clears the input', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<ChatComposer {...composerProps({ onSubmit })} />);
  await textbox().fill('  Plan Lisbon  ');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => onSubmit.mock.calls).toEqual([['Plan Lisbon']]);
  await expect.element(textbox()).toHaveTextContent('');
});

test('submits from the send button with a custom label', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<ChatComposer {...composerProps({ onSubmit, submitLabel: 'Send to Groam' })} />);
  const send = page.getByRole('button', { name: 'Send to Groam' });
  await expect.element(send).toBeDisabled();
  await textbox().fill('Hello');
  await expect.element(send).toBeEnabled();
  await send.click();
  await expect.poll(() => onSubmit.mock.calls).toEqual([['Hello']]);
});

test('restores the message when the submit fails', async () => {
  const onSubmit = vi.fn().mockResolvedValue(false);
  await render(<ChatComposer {...composerProps({ onSubmit })} />);
  await textbox().fill('Keep me');
  await page.getByRole('button', { name: 'Submit message' }).click();
  await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
  await expect.element(textbox()).toHaveTextContent('Keep me');
});

test('ignores blank messages and disabled composers', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  const { rerender } = await render(<ChatComposer {...composerProps({ onSubmit })} />);
  await textbox().fill('   ');
  await userEvent.keyboard('{Enter}');
  await rerender(<ChatComposer {...composerProps({ disabled: true, message: 'Hi', onSubmit })} />);
  await expect.element(page.getByRole('button', { name: 'Submit message' })).toBeDisabled();
  await page
    .getByRole('form', { name: 'Ask Groam' })
    .element()
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test('stops controlled changes at maxLength', async () => {
  const onMessageChange = vi.fn();
  function Controlled() {
    const [message, setMessage] = useState('');
    return (
      <ChatComposer
        {...composerProps({
          maxLength: 4,
          message,
          onMessageChange: (next) => {
            setMessage(next);
            onMessageChange(next);
          }
        })}
      />
    );
  }
  await render(<Controlled />);
  await textbox().fill('ab');
  await userEvent.keyboard('cdefg');
  await vi.waitFor(() => expect(onMessageChange).toHaveBeenLastCalledWith('abcd'));
  expect(onMessageChange.mock.calls.every(([value]) => String(value).length <= 4)).toBe(true);
});

test('focuses the input on mount only when enabled', async () => {
  const { unmount } = await render(<ChatComposer {...composerProps({ focusOnMount: true })} />);
  await expect.element(textbox()).toHaveFocus();
  await unmount();
  await render(<ChatComposer {...composerProps({ disabled: true, focusOnMount: true })} />);
  await expect.element(textbox()).not.toHaveFocus();
});

test('shows a stop button while responding and calls onStop', async () => {
  const onStop = vi.fn().mockResolvedValue(true);
  await render(<ChatComposer {...composerProps({ isResponding: true, onStop })} />);
  await page.getByRole('button', { name: 'Stop response' }).click();
  expect(onStop).toHaveBeenCalledOnce();
  await expect
    .element(page.getByRole('button', { name: 'Submit message' }))
    .not.toBeInTheDocument();
});

test('disables the stop button while stopping', async () => {
  await render(
    <ChatComposer {...composerProps({ isResponding: true, isStopping: true, onStop: vi.fn() })} />
  );
  await expect.element(page.getByRole('button', { name: 'Stop response' })).toBeDisabled();
});

test('keeps the submit button while responding without an onStop', async () => {
  await render(<ChatComposer {...composerProps({ isResponding: true, message: 'Next' })} />);
  await expect.element(page.getByRole('button', { name: 'Submit message' })).toBeEnabled();
});

test.each(['default', 'sidechat'] as const)(
  'renders the %s variant with its notice and slots',
  async (variant) => {
    await render(
      <ChatComposer
        {...composerProps({
          beforeInput: <span>Attached: plan.pdf</span>,
          toolbarStart: <button type="button">Attach</button>,
          variant
        })}
      />
    );
    const form = page.getByRole('form', { name: 'Ask Groam' });
    await expect.element(form).toBeVisible();
    await expect.element(page.getByText('Groam can make mistakes.')).toBeVisible();
    await expect.element(page.getByText('Attached: plan.pdf')).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Attach' })).toBeVisible();
    expect(form.element().className.includes('rounded-2xl border')).toBe(variant === 'sidechat');
  }
);
