import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
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
  cleanup();
  vi.clearAllMocks();
  recorder.isRecording = false;
  recorder.isUnsupported = false;
});

test('hides the control when recording is unsupported', () => {
  recorder.isUnsupported = true;
  const { container } = render(<VoiceRecordButton onRecorded={vi.fn()} />);
  expect(container.firstChild).toBeNull();
});

test('starts recording from idle', async () => {
  recorder.start.mockResolvedValue(true);
  render(<VoiceRecordButton onRecorded={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record voice note' }));
  expect(recorder.start).toHaveBeenCalled();
});

test('toasts when the microphone cannot be opened', async () => {
  recorder.start.mockResolvedValue(false);
  render(<VoiceRecordButton onRecorded={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record voice note' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unable to access the microphone'));
});

test('forwards a recorded file and toasts when the take is empty', async () => {
  recorder.isRecording = true;
  const onRecorded = vi.fn();
  recorder.stop.mockResolvedValueOnce(null);
  const { rerender } = render(<VoiceRecordButton onRecorded={onRecorded} />);
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Recording was empty'));

  const file = new File(['abc'], 'voice.webm', { type: 'audio/webm' });
  recorder.stop.mockResolvedValueOnce(file);
  rerender(<VoiceRecordButton onRecorded={onRecorded} />);
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }));
  await waitFor(() => expect(onRecorded).toHaveBeenCalledWith(file));
});
