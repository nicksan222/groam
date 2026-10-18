import { act, renderHook } from '@groam/vitest-config/react';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { useVoiceRecorder } from './use-voice-recorder';

afterEach(() => {
  vi.unstubAllGlobals();
});

test('reports unsupported when MediaRecorder is missing', async () => {
  vi.stubGlobal('MediaRecorder', undefined);
  const { result } = await renderHook(() => useVoiceRecorder());
  expect(result.current.isUnsupported).toBe(true);
});

test('records a voice file when MediaRecorder is available', async () => {
  class FakeMediaRecorder {
    static isTypeSupported = () => true;
    mimeType = 'audio/webm';
    ondataavailable: ((event: { data: Blob }) => void) | null = null;
    onstop: (() => void) | null = null;
    start() {
      this.ondataavailable?.({ data: new Blob(['abc'], { type: 'audio/webm' }) });
    }
    stop() {
      this.onstop?.();
    }
  }
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  vi.stubGlobal('navigator', {
    mediaDevices: {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] })
    }
  });

  const { result } = await renderHook(() => useVoiceRecorder());
  await act(async () => {
    await expect(result.current.start()).resolves.toBe(true);
  });
  expect(result.current.isRecording).toBe(true);
  const captured: { file: File | null } = { file: null };
  await act(async () => {
    captured.file = await result.current.stop();
  });
  expect(captured.file?.type).toBe('audio/webm');
  expect(captured.file?.name).toMatch(/^voice-\d+\.webm$/);
});
