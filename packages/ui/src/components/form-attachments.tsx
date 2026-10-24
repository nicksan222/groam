import { FileText, Paperclip, X } from '@groam/icons';
import { Button } from '@groam/ui/components/button';
import { FormSection } from '@groam/ui/components/form-section';
import { Input } from '@groam/ui/components/input';
import { Spinner } from '@groam/ui/components/spinner';
import { cn } from '@groam/ui/lib/utils';
import { type Ref, useRef } from 'react';

/**
 * The files a form carries (tickets, bookings, maps): an "Add files" button over a hidden file
 * input, then one removable row per file. Disables adding once `max` files are attached.
 */
export type FormAttachmentsProps<TId extends string = string> = {
  accept?: string;
  attachments: ReadonlyArray<{ id: TId; name: string }>;
  className?: string;
  /** What files fit; every form takes the same kinds, so most callers keep the default. */
  description?: string;
  disabled?: boolean;
  /** Accessible name of the hidden file input. */
  inputLabel: string;
  /** Lets a caller open the picker itself, e.g. from a keyboard shortcut. */
  inputRef?: Ref<HTMLInputElement>;
  inputTestId?: string;
  isUploading?: boolean;
  legend: string;
  max: number;
  onRemove: (id: TId) => void;
  onUpload: (files: FileList | null) => void;
  uploadLabel?: string;
};

/** The one attachments block for every form that takes files. */
function FormAttachments<TId extends string>({
  accept,
  attachments,
  className,
  description = 'PDFs, images, or video.',
  disabled = false,
  inputLabel,
  inputRef,
  inputTestId,
  isUploading = false,
  legend,
  max,
  onRemove,
  onUpload,
  uploadLabel = 'Add files'
}: FormAttachmentsProps<TId>) {
  const ownRef = useRef<HTMLInputElement>(null);
  const full = attachments.length >= max;
  const blocked = disabled || isUploading;
  return (
    <FormSection
      className={className}
      hint={attachments.length > 0 ? `${attachments.length} of ${max} files` : undefined}
      legend={legend}
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-3',
          attachments.length === 0 && 'rounded-lg border border-dashed border-border p-3'
        )}
      >
        <Button
          disabled={blocked || full}
          onClick={() => ownRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          {isUploading ? <Spinner /> : <Paperclip />}
          {uploadLabel}
        </Button>
        <Input
          accept={accept}
          aria-label={inputLabel}
          className="sr-only"
          data-testid={inputTestId}
          disabled={blocked || full}
          multiple
          onChange={(event) => onUpload(event.target.files)}
          ref={(node) => {
            ownRef.current = node;
            if (typeof inputRef === 'function') inputRef(node);
            else if (inputRef) inputRef.current = node;
          }}
          tabIndex={-1}
          type="file"
        />
        <p className="text-xs text-muted-foreground">
          {full ? `Up to ${max} files.` : description}
        </p>
      </div>
      {attachments.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {attachments.map((attachment) => (
            <li className="flex items-center gap-2 rounded-lg border p-2" key={attachment.id}>
              <FileText aria-hidden className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-sm">{attachment.name}</span>
              <Button
                aria-label={`Remove ${attachment.name}`}
                disabled={blocked}
                onClick={() => onRemove(attachment.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </FormSection>
  );
}

export { FormAttachments };
