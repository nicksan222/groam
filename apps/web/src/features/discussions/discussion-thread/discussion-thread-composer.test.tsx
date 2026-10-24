import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { testIds } from '@/lib/test-ids';
import { DiscussionThreadComposer } from './discussion-thread-composer';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: toastError, success: vi.fn() }
}));

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

test('submits composed text to onSend', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('  Packing list  ');
  await page.getByRole('button', { name: 'Send message' }).click();

  await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith({ files: [], text: 'Packing list' }));
});

test('restores the draft when send fails', async () => {
  const onSend = vi.fn().mockResolvedValue(false);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('Hold this');
  await page.getByRole('button', { name: 'Send message' }).click();

  await vi.waitFor(() => expect(onSend).toHaveBeenCalled());
  await expect
    .element(page.getByRole('textbox', { name: 'Message' }))
    .toHaveTextContent('Hold this');
});

test('does not restore the draft when a second Enter is ignored while the first send succeeds', async () => {
  let finish: (sent: boolean) => void = () => {};
  const onSend = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  const box = page.getByRole('textbox', { name: 'Message' });
  await box.fill('Once only');
  await userEvent.keyboard('{Enter}{Enter}');
  await vi.waitFor(() => expect(onSend).toHaveBeenCalledTimes(1));
  finish(true);
  await expect.element(box).not.toHaveTextContent('Once only');
  expect(onSend).toHaveBeenCalledTimes(1);
});

test('rejects audio attachments even when supplied directly to the picker', async () => {
  const onSend = vi.fn();
  const { container } = await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected an attachment input');
  expect(input.accept).not.toContain('audio/');
  await userEvent.upload(input, new File(['audio'], 'voice.webm', { type: 'audio/webm' }));
  expect(toastError).toHaveBeenCalledWith('Upload an image, video, or PDF');
  expect(onSend).not.toHaveBeenCalled();
});

test('rejects unsupported attachments', async () => {
  const onSend = vi.fn();
  const { container } = await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error('Expected an attachment input');
  await userEvent.upload(
    input,
    new File(['nope'], 'notes.exe', { type: 'application/x-msdownload' })
  );
  expect(toastError).toHaveBeenCalledWith('Upload an image, video, or PDF');
  expect(onSend).not.toHaveBeenCalled();
});

test('stops Groam from the composer chrome', async () => {
  const onStop = vi.fn().mockResolvedValue(true);
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer canStop isStopping={false} onSend={onSend} onStop={onStop} />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('Still here');
  await page.getByRole('button', { name: 'Stop Groam' }).click();
  expect(onStop).toHaveBeenCalled();
  expect(onSend).not.toHaveBeenCalled();
  // People can keep talking while Groam works: send stays beside stop.
  await expect.element(page.getByRole('button', { name: 'Send message' })).toBeEnabled();
});

test('disables stop while Groam is stopping', async () => {
  await render(<DiscussionThreadComposer canStop isStopping onSend={vi.fn()} onStop={vi.fn()} />);
  await expect.element(page.getByRole('button', { name: 'Stop Groam' })).toBeDisabled();
});

test('keeps send disabled until there is something to send', async () => {
  await render(
    <DiscussionThreadComposer
      canStop={false}
      isStopping={false}
      onSend={vi.fn()}
      onStop={vi.fn()}
    />
  );
  const send = page.getByRole('button', { name: 'Send message' });
  await expect.element(send).toBeDisabled();
  await page.getByRole('textbox', { name: 'Message' }).fill('   ');
  await expect.element(send).toBeDisabled();
  await page.getByRole('textbox', { name: 'Message' }).fill('Hi');
  await expect.element(send).toBeEnabled();
});

test('shows the sending state on the send button', async () => {
  let finish: (sent: boolean) => void = () => {};
  const onSend = vi.fn(() => new Promise<boolean>((resolve) => (finish = resolve)));
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );
  await page.getByRole('textbox', { name: 'Message' }).fill('Hi');
  await page.getByRole('button', { name: 'Send message' }).click();
  const send = page.getByRole('button', { name: 'Send message' });
  await expect.element(send).toHaveAttribute('aria-busy', 'true');
  await expect.element(send).toBeDisabled();
  finish(true);
  await expect.element(send).not.toHaveAttribute('aria-busy');
});

test('tags Groam and opens commands from the leading actions', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer
      canStop={false}
      commands={[{ description: 'Start a poll', name: 'poll', run: vi.fn() }]}
      isStopping={false}
      onSend={onSend}
      onStop={vi.fn()}
    />
  );

  await page.getByTestId(testIds.composerCommandButton).click();
  await expect.element(page.getByTestId(testIds.composerCommandMenu)).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await page.getByRole('textbox', { name: 'Message' }).fill('');

  await page.getByRole('button', { name: 'Ask Groam' }).click();
  await expect
    .element(page.getByRole('button', { name: 'Groam already tagged' }))
    .toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Send message' }).click();
  await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith({ files: [], text: '@groam' }));
});

test('offers the command button only when the thread has commands', async () => {
  await render(
    <DiscussionThreadComposer
      canStop={false}
      isStopping={false}
      onSend={vi.fn()}
      onStop={vi.fn()}
    />
  );
  await expect.element(page.getByRole('button', { name: 'Ask Groam' })).toBeVisible();
  await expect.element(page.getByTestId(testIds.composerCommandButton)).not.toBeInTheDocument();
});

test('runs a typed command instead of sending it', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  const summarize = vi.fn();
  await render(
    <DiscussionThreadComposer
      canStop={false}
      commands={[{ description: 'Summarize', name: 'summarize', run: summarize }]}
      isStopping={false}
      onSend={onSend}
      onStop={vi.fn()}
    />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('/summarize');
  await page.getByRole('button', { name: 'Send message' }).click();

  await vi.waitFor(() => expect(summarize).toHaveBeenCalledOnce());
  expect(onSend).not.toHaveBeenCalled();
  await expect.element(page.getByRole('textbox', { name: 'Message' })).toHaveTextContent('');
});

test('keeps an unknown command and explains it', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer
      canStop={false}
      commands={[{ description: 'Summarize', name: 'summarize', run: vi.fn() }]}
      isStopping={false}
      onSend={onSend}
      onStop={vi.fn()}
    />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('/nope');
  await page.getByRole('button', { name: 'Send message' }).click();

  await vi.waitFor(() => expect(toastError).toHaveBeenCalledWith('Unknown command /nope'));
  expect(onSend).not.toHaveBeenCalled();
  await expect.element(page.getByRole('textbox', { name: 'Message' })).toHaveTextContent('/nope');
});

test('sends with Enter and clears the composer', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  const input = page.getByRole('textbox', { name: 'Message' });
  await expect.element(input).toHaveFocus();
  await input.fill('Train at nine');
  await userEvent.keyboard('{Enter}');

  await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith({ files: [], text: 'Train at nine' }));
  await expect.element(input).toHaveTextContent('');
});

test('tags Groam from the "@" suggestions and sends the mention token', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('@gr');
  await page.getByRole('option', { name: /@groam/ }).click();
  await userEvent.keyboard('hotels near the station?');
  await page.getByRole('button', { name: 'Send message' }).click();

  await vi.waitFor(() =>
    expect(onSend).toHaveBeenCalledWith({ files: [], text: '@groam hotels near the station?' })
  );
});

test('runs a "/" suggestion picked with Enter', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  const poll = vi.fn();
  await render(
    <DiscussionThreadComposer
      canStop={false}
      commands={[{ description: 'Start a poll', name: 'poll', run: poll }]}
      isStopping={false}
      onSend={onSend}
      onStop={vi.fn()}
    />
  );

  const input = page.getByRole('textbox', { name: 'Message' });
  await input.fill('/po');
  await expect.element(page.getByTestId(testIds.composerCommandMenu)).toBeVisible();
  await expect
    .element(page.getByTestId(testIds.composerCommandOption))
    .toHaveAccessibleName(/poll/);
  await userEvent.keyboard('{Enter}');

  await vi.waitFor(() => expect(poll).toHaveBeenCalledOnce());
  expect(onSend).not.toHaveBeenCalled();
  await expect.element(input).toHaveTextContent('');
});

test('prefills a command that needs a choice, then runs the picked choice', async () => {
  const pick = vi.fn();
  await render(
    <DiscussionThreadComposer
      canStop={false}
      commands={[
        {
          argument: 'item',
          description: 'Link an item',
          name: 'link',
          options: () => [{ group: 'Issues', id: 'i1', label: 'Book flights', run: pick }]
        }
      ]}
      isStopping={false}
      onSend={vi.fn()}
      onStop={vi.fn()}
    />
  );

  const input = page.getByRole('textbox', { name: 'Message' });
  await input.fill('/li');
  await page.getByRole('option', { name: /link/ }).click();
  await expect.element(input).toHaveTextContent('/link');
  const choice = page.getByRole('option', { name: /Book flights/ });
  await expect.element(choice).toBeVisible();
  await choice.click();

  await vi.waitFor(() => expect(pick).toHaveBeenCalledOnce());
  await expect.element(input).toHaveTextContent('');
});
