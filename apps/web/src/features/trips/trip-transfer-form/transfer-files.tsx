import { FormAttachments } from '@groam/ui/components/form-attachments';
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
    <FormAttachments
      accept={mediaFileAccept}
      attachments={attachments}
      disabled={isBusy}
      inputLabel={`Upload files for travel from ${fromLabel} to ${toLabel}`}
      inputRef={fileInputRef}
      inputTestId={testIds.travelUpload}
      isUploading={isUploading}
      legend="Tickets and directions"
      max={5}
      onRemove={onRemove}
      onUpload={onUpload}
    />
  );
}
