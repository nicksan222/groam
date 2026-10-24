import { Paperclip } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { useRef } from 'react';
import { mediaFileAccept } from '@/features/media/media-validation';

/** Opens the media picker from the composer's leading actions. */
export function DiscussionAttachButton({
  disabled,
  onFiles
}: {
  disabled: boolean;
  onFiles: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button
        aria-label="Attach files"
        className="size-9 touch-manipulation rounded-full text-muted-foreground"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        size="icon"
        type="button"
        variant="ghost"
      >
        <Paperclip aria-hidden="true" className="size-[1.125rem]" />
      </Button>
      {/* The button above opens this picker; hidden so assistive tech hears one control. */}
      <Input
        accept={mediaFileAccept}
        hidden
        multiple
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = '';
          if (files.length > 0) onFiles(files);
        }}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />
    </>
  );
}
