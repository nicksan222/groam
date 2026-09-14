import { Button } from '@groam/ui/components/button';
import { toast } from '@groam/ui/components/toast';
import { useVoiceRecorder } from '@groam/ui/hooks/use-voice-recorder';
import { Mic, Square } from 'lucide-react';

export type VoiceRecordButtonProps = {
  disabled?: boolean;
  onRecorded: (file: File) => void;
};

function VoiceRecordButton({ disabled = false, onRecorded }: VoiceRecordButtonProps) {
  const recorder = useVoiceRecorder();
  if (recorder.isUnsupported) return null;

  return (
    <Button
      aria-label={recorder.isRecording ? 'Stop recording' : 'Record voice note'}
      className="size-9 touch-manipulation rounded-full"
      disabled={disabled}
      onClick={() => {
        void (async () => {
          if (recorder.isRecording) {
            const file = await recorder.stop();
            if (file) onRecorded(file);
            else toast.error('Recording was empty');
            return;
          }
          const started = await recorder.start();
          if (!started) toast.error('Unable to access the microphone');
        })();
      }}
      size="icon"
      title={recorder.isRecording ? 'Stop recording' : 'Record voice note'}
      type="button"
      variant={recorder.isRecording ? 'destructive' : 'ghost'}
    >
      {recorder.isRecording ? (
        <Square className="size-3.5 fill-current" />
      ) : (
        <Mic className="size-[1.125rem]" />
      )}
    </Button>
  );
}

export { VoiceRecordButton };
