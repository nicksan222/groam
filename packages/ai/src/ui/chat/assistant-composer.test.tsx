import { render } from '@groam/vitest-config/react';
import { useState } from 'react';
import { expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { AssistantComposer, type AssistantComposerProps } from './assistant-composer';

function composerProps(overrides: Partial<AssistantComposerProps> = {}): AssistantComposerProps {
  return {
    contextAvailable: true,
    disabled: false,
    isSending: false,
    onSubmit: vi.fn().mockResolvedValue(true),
    ...overrides
  };
}

const textbox = () => page.getByRole('textbox', { name: 'Assistant prompt' });
const submitButton = () => page.getByRole('button', { name: 'Submit prompt' });

test('submits the trimmed prompt on Enter and clears the input', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<AssistantComposer {...composerProps({ onSubmit })} />);
  await textbox().fill('  Plan Lisbon  ');
  await userEvent.keyboard('{Enter}');
  await expect.poll(() => onSubmit.mock.calls).toEqual([['Plan Lisbon']]);
  await expect.element(textbox()).toHaveTextContent('');
});

test('enables the send button only for a non-blank prompt', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(<AssistantComposer {...composerProps({ onSubmit })} />);
  await expect.element(submitButton()).toBeDisabled();
  await textbox().fill('   ');
  await expect.element(submitButton()).toBeDisabled();
  await textbox().fill('Hello');
  await expect.element(submitButton()).toBeEnabled();
  await submitButton().click();
  await expect.poll(() => onSubmit.mock.calls).toEqual([['Hello']]);
});

test('restores the prompt when sending fails', async () => {
  const onSubmit = vi.fn().mockResolvedValue(false);
  await render(<AssistantComposer {...composerProps({ onSubmit })} />);
  await textbox().fill('Keep me');
  await submitButton().click();
  await expect.poll(() => onSubmit.mock.calls.length).toBe(1);
  await expect.element(textbox()).toHaveTextContent('Keep me');
});

test('does not submit while disabled', async () => {
  const onSubmit = vi.fn().mockResolvedValue(true);
  await render(
    <AssistantComposer {...composerProps({ disabled: true, message: 'Hi', onSubmit })} />
  );
  await expect.element(textbox()).toHaveAttribute('contenteditable', 'false');
  await expect.element(submitButton()).toBeDisabled();
  page
    .getByRole('form', { name: 'Assistant prompt' })
    .element()
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(onSubmit).not.toHaveBeenCalled();
});

test('keeps controlled changes within maxLength', async () => {
  const onMessageChange = vi.fn();
  function Controlled() {
    const [message, setMessage] = useState('');
    return (
      <AssistantComposer
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
  await expect.element(textbox()).toHaveTextContent('abcd');
});

test('focuses the input on mount only when enabled', async () => {
  const { unmount } = await render(
    <AssistantComposer {...composerProps({ focusOnMount: true })} />
  );
  await expect.element(textbox()).toHaveFocus();
  await unmount();
  await render(<AssistantComposer {...composerProps({ disabled: true, focusOnMount: true })} />);
  await expect.element(textbox()).not.toHaveFocus();
});

test('swaps send for stop while responding and calls onStop', async () => {
  const onStop = vi.fn().mockResolvedValue(true);
  await render(<AssistantComposer {...composerProps({ isSending: true, onStop })} />);
  await expect.element(textbox()).toHaveAttribute('aria-placeholder', 'Groam is responding…');
  await page.getByRole('button', { name: 'Stop response' }).click();
  expect(onStop).toHaveBeenCalledOnce();
  await expect.element(submitButton()).not.toBeInTheDocument();
});

test('keeps stop inert while the response is stopping', async () => {
  await render(
    <AssistantComposer {...composerProps({ isSending: true, isStopping: true, onStop: vi.fn() })} />
  );
  await expect
    .element(page.getByRole('button', { name: 'Stop response' }))
    .toHaveAttribute('aria-disabled', 'true');
});

test('keeps send available while responding without a stop handler', async () => {
  await render(<AssistantComposer {...composerProps({ isSending: true, message: 'Next' })} />);
  await expect.element(submitButton()).toBeEnabled();
});

test.each(['default', 'sidechat'] as const)(
  'renders the %s variant with its notice',
  async (variant) => {
    await render(<AssistantComposer {...composerProps({ contextAvailable: false, variant })} />);
    await expect.element(page.getByRole('form', { name: 'Assistant prompt' })).toBeVisible();
    await expect.element(page.getByText('AI can make mistakes.')).toBeVisible();
    // The coss submit renders through the shared Button, keeping its look and size.
    await expect.element(submitButton()).toHaveClass('rounded-full');
    await expect.element(textbox()).toHaveAttribute('aria-placeholder', 'Waiting for this page…');
  }
);
