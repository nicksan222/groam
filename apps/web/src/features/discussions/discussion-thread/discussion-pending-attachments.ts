import { mediaValidationError } from '@/features/media/media-validation';
import { MAX_MEDIA_PER_MESSAGE } from './discussion-message-body';

// biome-ignore lint/plugin/no-local-type-definitions: local implementation shape
export type PendingAttachment = {
  file: File;
  id: string;
  previewUrl: string | null;
};

const previewUrlCache = new Set<string>();

export function isPreviewableMedia(contentType: string): boolean {
  return (
    contentType.startsWith('image/') ||
    contentType.startsWith('video/') ||
    contentType.startsWith('audio/')
  );
}

export function createPendingPreviewUrl(file: File): string {
  previewUrlCache.add(URL.createObjectURL(file));
  let url = '';
  for (const item of previewUrlCache) url = item;
  return url;
}

export function appendPendingAttachments(
  current: PendingAttachment[],
  files: File[],
  createPreviewUrl: (file: File) => string = createPendingPreviewUrl
): { errors: string[]; next: PendingAttachment[] } {
  const next = [...current];
  const errors: string[] = [];
  for (const file of files) {
    if (next.length >= MAX_MEDIA_PER_MESSAGE) {
      errors.push(`You can attach up to ${MAX_MEDIA_PER_MESSAGE} files`);
      break;
    }
    const validationError = mediaValidationError(file);
    if (validationError) {
      errors.push(validationError);
      continue;
    }
    next.push({
      file,
      id: crypto.randomUUID(),
      previewUrl: isPreviewableMedia(file.type) ? createPreviewUrl(file) : null
    });
  }
  return { errors, next };
}

export function revokePendingAttachmentUrls(attachments: PendingAttachment[]): void {
  for (const item of attachments) {
    const url = item.previewUrl;
    if (url) URL.revokeObjectURL(url);
  }
}
