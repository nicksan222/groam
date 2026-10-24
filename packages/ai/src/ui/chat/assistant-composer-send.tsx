import { SendHorizontal } from '@groam/icons';
import { ComposerSend, ComposerStop } from '@groam/ui/components/composer';
import { cn } from '@groam/ui/lib/utils';

/** The coss send button, swapped for stop while a response the assistant can stop is running. */
export function AssistantComposerSend({
  isResponding,
  isStopping,
  onStop,
  variant
}: {
  isResponding: boolean;
  isStopping: boolean;
  onStop?: () => Promise<boolean>;
  variant: 'default' | 'sidechat';
}) {
  const className = variant === 'sidechat' ? 'size-11 sm:size-7' : 'size-7';
  if (isResponding && onStop) {
    return (
      <ComposerStop
        className={className}
        label="Stop response"
        onStop={onStop}
        size="icon-sm"
        stopping={isStopping}
      />
    );
  }
  return (
    <ComposerSend
      className={className}
      icon={<SendHorizontal aria-hidden="true" className={cn(isResponding && 'animate-pulse')} />}
      label="Submit prompt"
      size="icon-sm"
    />
  );
}
