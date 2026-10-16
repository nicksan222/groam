import { render } from '@groam/vitest-config/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { page } from 'vite-plus/test/browser';
import { VoiceRecordButton } from './voice-record-button';

const recorder = vi.hoisted(() => ({
  isRecording: false,
  isUnsupported: false,
  start: vi.fn(),
  stop: vi.fn()
}));

vi.mock('@groam/ui/hooks/use-voice-recorder', () => ({
  useVoiceRecorder: () => recorder
}));

vi.mock('@groam/ui/components/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

const { toast } = await import('@groam/ui/components/toast');

afterEach(() => {
  vi.clearAllMocks();
  recorder.isRecording = false;
  recorder.isUnsupported = false;
});

test('hides the control when recording is unsupported', async () => {
  recorder.isUnsupported = true;
  const { container } = await render(<VoiceRecordButton onRecorded={vi.fn()} />);
  expect(container.firstChild).toBeNull();
});

test('starts recording from idle', async () => {
  recorder.start.mockResolvedValue(true);
  await render(<VoiceRecordButton onRecorded={vi.fn()} />);
  await page.getByRole('button', { name: 'Record voice note' }).click();
  expect(recorder.start).toHaveBeenCalled();
});

test('toasts when the microphone cannot be opened', async () => {
  recorder.start.mockResolvedValue(false);
  await render(<VoiceRecordButton onRecorded={vi.fn()} />);
  await page.getByRole('button', { name: 'Record voice note' }).click();
  await vi.waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith('Unable to access the microphone')
  );
});

test('forwards a recorded file and toasts when the take is empty', async () => {
  recorder.isRecording = true;
  const onRecorded = vi.fn();
  recorder.stop.mockResolvedValueOnce(null);
  const { rerender } = await render(<VoiceRecordButton onRecorded={onRecorded} />);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Recording was empty'));

  const file = new File(['abc'], 'voice.webm', { type: 'audio/webm' });
  recorder.stop.mockResolvedValueOnce(file);
  await rerender(<VoiceRecordButton onRecorded={onRecorded} />);
  await page.getByRole('button', { name: 'Stop recording' }).click();
  await vi.waitFor(() => expect(onRecorded).toHaveBeenCalledWith(file));
});
