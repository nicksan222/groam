import type { DiscussionMessageMedia } from '@/types/discussions';

export const MAX_MEDIA_PER_MESSAGE = 5;

export type { DiscussionMessageMedia };

const MEDIA_PREVIEW_LABELS = new Set([
  'Sent a photo',
  'Sent a video',
  'Sent an audio file',
  'Sent a file'
]);

export function discussionMessageBody(message: {
  attachments?: DiscussionMessageMedia[];
  media?: DiscussionMessageMedia[];
  text: string;
}): {
  attachments: DiscussionMessageMedia[];
  text: string;
} {
  const attachments = message.attachments ?? message.media ?? [];
  const trimmed = message.text.trim();
  const hidePreviewLabel =
    attachments.length > 0 &&
    (trimmed.length === 0 || MEDIA_PREVIEW_LABELS.has(trimmed) || /^Sent \d+ files$/.test(trimmed));
  return {
    attachments,
    text: hidePreviewLabel ? '' : message.text
  };
}
