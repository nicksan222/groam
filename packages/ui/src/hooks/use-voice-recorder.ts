import { useCallback, useEffect, useRef, useState } from 'react';

const PREFERRED_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'] as const;

type VoiceRecorderState = 'idle' | 'recording' | 'unsupported';

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function useVoiceRecorder() {
  const [state, setState] = useState<VoiceRecorderState>(() =>
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? 'idle'
      : 'unsupported'
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const cleanup = useCallback(() => {
    mediaRecorderRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    chunksRef.current = [];
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (state !== 'idle') return false;
    const mimeType = pickMimeType();
    if (!mimeType) {
      setState('unsupported');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState('recording');
      return true;
    } catch {
      cleanup();
      setState('idle');
      return false;
    }
  }, [cleanup, state]);

  const stop = useCallback(async (): Promise<File | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || state !== 'recording') return null;
    const mimeType = recorder.mimeType || pickMimeType() || 'audio/webm';
    const file = await new Promise<File | null>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setState('idle');
        if (blob.size === 0) {
          resolve(null);
          return;
        }
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
        resolve(
          new File([blob], `voice-${Date.now()}.${extension}`, {
            type: mimeType.split(';', 1)[0]
          })
        );
      };
      recorder.stop();
    });
    return file;
  }, [cleanup, state]);

  const cancel = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    cleanup();
    setState((current) => (current === 'unsupported' ? current : 'idle'));
  }, [cleanup]);

  return {
    cancel,
    isRecording: state === 'recording',
    isUnsupported: state === 'unsupported',
    start,
    state,
    stop
  };
}
