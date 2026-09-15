import { Button } from '@groam/ui/components/button';
import { Input } from '@groam/ui/components/input';
import { Label } from '@groam/ui/components/label';
import { Spinner } from '@groam/ui/components/spinner';
import { FileText, Upload, X } from 'lucide-react';
import type { RefObject } from 'react';
import { mediaFileAccept } from '@/features/media/media-validation';
import { testIds } from '@/lib/test-ids';
import type { TransferForm } from './transfer-form-types';

export function TransferFiles({
  attachments,
  fileInputRef,
  fromLabel,
  isBusy,
  isUploading,
  onRemove,
  onUpload,
  toLabel
}: {
  attachments: TransferForm['attachments'];
  fileInputRef: RefObject<HTMLInputElement | null>;
  fromLabel: string;
  isBusy: boolean;
  isUploading: boolean;
  onRemove: TransferForm['removeAttachment'];
  onUpload: (files: FileList | null) => void;
  toLabel: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Label>Tickets and directions</Label>
          <p className="text-xs text-muted-foreground">
            {attachments.length} of 5 files · PDFs, images, audio, or video.
          </p>
        </div>
        <Button
          disabled={isBusy || attachments.length >= 5}
          onClick={() => fileInputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          {isUploading ? <Spinner /> : <Upload />} Upload files
        </Button>
        <Input
          accept={mediaFileAccept}
          aria-label={`Upload files for travel from ${fromLabel} to ${toLabel}`}
          className="sr-only"
          data-testid={testIds.travelUpload}
          disabled={isBusy || attachments.length >= 5}
          multiple
          onChange={(event) => onUpload(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-border/50 p-3">
          {attachments.map((attachment) => (
            <span
              className="inline-flex max-w-56 items-center gap-1.5 rounded-full border py-1 pl-3 pr-1 text-xs font-medium"
              key={attachment.id}
            >
              <FileText className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{attachment.name}</span>
              <Button
                aria-label={`Remove ${attachment.name}`}
                disabled={isBusy}
                onClick={() => onRemove(attachment.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
              </Button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
