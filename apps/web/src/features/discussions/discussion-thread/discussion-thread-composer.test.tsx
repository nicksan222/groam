import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
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
  await render(
    <DiscussionThreadComposer canStop isStopping={false} onSend={vi.fn()} onStop={onStop} />
  );

  await page.getByRole('button', { name: 'Stop Groam' }).click();
  expect(onStop).toHaveBeenCalled();
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
