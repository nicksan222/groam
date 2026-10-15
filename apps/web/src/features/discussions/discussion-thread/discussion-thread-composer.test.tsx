import { render } from '@groam/vitest-config/react';
import { beforeEach, expect, test, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { DiscussionThreadComposer } from './discussion-thread-composer';

const toastError = vi.hoisted(() => vi.fn());

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: toastError, success: vi.fn() }
}));

vi.mock('@groam/ui/components/voice-record-button', () => ({
  VoiceRecordButton: ({
    disabled,
    onRecorded
  }: {
    disabled?: boolean;
    onRecorded: (file: File) => void;
  }) => (
    <button
      disabled={disabled}
      onClick={() => onRecorded(new File(['abc'], 'voice.webm', { type: 'audio/webm' }))}
      type="button"
    >
      Record voice note
    </button>
  )
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
  await page.getByRole('button', { name: 'Reply' }).click();

  await vi.waitFor(() => expect(onSend).toHaveBeenCalledWith({ files: [], text: 'Packing list' }));
});

test('restores the draft when send fails', async () => {
  const onSend = vi.fn().mockResolvedValue(false);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  await page.getByRole('textbox', { name: 'Message' }).fill('Hold this');
  await page.getByRole('button', { name: 'Reply' }).click();

  await vi.waitFor(() => expect(onSend).toHaveBeenCalled());
  await expect.element(page.getByRole('textbox', { name: 'Message' })).toHaveValue('Hold this');
});

test('attaches a voice recording and allows empty text submit', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  await render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  await page.getByRole('button', { name: 'Record voice note' }).click();
  await expect.element(page.getByText('voice.webm')).toBeInTheDocument();

  await page.getByRole('button', { name: 'Reply' }).click();
  await vi.waitFor(() =>
    expect(onSend).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'voice.webm' })],
      text: ''
    })
  );
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
  expect(toastError).toHaveBeenCalledWith('Upload an image, video, audio file, or PDF');
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
