const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const mediaFileAccept =
  'application/pdf,audio/*,video/*,image/avif,image/gif,image/jpeg,image/png,image/webp';
const SUPPORTED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);
const SUPPORTED_CONTENT_TYPE_PREFIXES = ['audio/', 'video/'];

export function mediaValidationError(file: Pick<File, 'size' | 'type'>): string | null {
  if (file.size > MAX_FILE_SIZE) return 'Files must be 25 MB or smaller';
  if (
    !SUPPORTED_CONTENT_TYPES.has(file.type) &&
    !SUPPORTED_CONTENT_TYPE_PREFIXES.some((prefix) => file.type.startsWith(prefix))
  ) {
    return 'Upload an image, video, audio file, or PDF';
  }
  return null;
}
