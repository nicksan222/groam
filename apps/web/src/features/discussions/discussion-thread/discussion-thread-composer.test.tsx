import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
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

afterEach(cleanup);

test('submits composed text to onSend', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
    target: { value: '  Packing list  ' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

  await waitFor(() => expect(onSend).toHaveBeenCalledWith({ files: [], text: 'Packing list' }));
});

test('restores the draft when send fails', async () => {
  const onSend = vi.fn().mockResolvedValue(false);
  render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  fireEvent.change(screen.getByRole('textbox', { name: 'Message' }), {
    target: { value: 'Hold this' }
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

  await waitFor(() => expect(onSend).toHaveBeenCalled());
  expect(screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' }).value).toBe(
    'Hold this'
  );
});

test('attaches a voice recording and allows empty text submit', async () => {
  const onSend = vi.fn().mockResolvedValue(true);
  render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );

  fireEvent.click(screen.getByRole('button', { name: 'Record voice note' }));
  expect(screen.getByText('voice.webm')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
  await waitFor(() =>
    expect(onSend).toHaveBeenCalledWith({
      files: [expect.objectContaining({ name: 'voice.webm' })],
      text: ''
    })
  );
});

test('rejects unsupported attachments', () => {
  const onSend = vi.fn();
  const { container } = render(
    <DiscussionThreadComposer canStop={false} isStopping={false} onSend={onSend} onStop={vi.fn()} />
  );
  const input = container.querySelector('input[type="file"]');
  expect(input).toBeTruthy();
  fireEvent.change(input as HTMLInputElement, {
    target: { files: [new File(['nope'], 'notes.exe', { type: 'application/x-msdownload' })] }
  });
  expect(toastError).toHaveBeenCalledWith('Upload an image, video, audio file, or PDF');
  expect(onSend).not.toHaveBeenCalled();
});

test('stops Groam from the composer chrome', () => {
  const onStop = vi.fn().mockResolvedValue(true);
  render(<DiscussionThreadComposer canStop isStopping={false} onSend={vi.fn()} onStop={onStop} />);

  fireEvent.click(screen.getByRole('button', { name: 'Stop Groam' }));
  expect(onStop).toHaveBeenCalled();
});
