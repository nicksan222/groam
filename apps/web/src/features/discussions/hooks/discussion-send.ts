import type { Id } from '@groam/backend/data-model';
import type { useCurrentAgentContext } from '@groam/ui/ai/context/agent-context';
import { serializeAgentScreenContext } from '@groam/ui/ai/context/agent-screen-context';
import { toast } from '@groam/ui/components/toast';
import type { useAction, useMutation } from 'convex/react';
import type { useMediaUpload } from '@/features/media/hooks/use-media-upload';
import { errorMessage } from '@/lib/errors';
import type { DiscussionMessageMedia } from '@/types/discussions';
import type { createDiscussionSendStore } from './discussion-send-store';

export function canSendDiscussion({
  files,
  hasStreamingResponse,
  normalizedPrompt,
  sending,
  threadId
}: {
  files: File[];
  hasStreamingResponse: boolean;
  normalizedPrompt: string;
  sending: boolean;
  threadId: string | null;
}) {
  return Boolean(
    threadId && (normalizedPrompt || files.length > 0) && !sending && !hasStreamingResponse
  );
}

export async function sendDiscussionMessage({
  context,
  discussionId,
  files,
  normalizedPrompt,
  previewMedia,
  respondAction,
  sendMutation,
  store,
  uploadMedia
}: {
  context: ReturnType<typeof useCurrentAgentContext>;
  discussionId: Id<'discussions'>;
  files: File[];
  normalizedPrompt: string;
  previewMedia: DiscussionMessageMedia[];
  respondAction: ReturnType<typeof useAction>;
  sendMutation: ReturnType<typeof useMutation>;
  store: ReturnType<typeof createDiscussionSendStore>;
  uploadMedia: ReturnType<typeof useMediaUpload>;
}): Promise<boolean> {
  const mediaIds = await uploadDiscussionMedia({ files, previewMedia, store, uploadMedia });
  if (!mediaIds) return false;
  const result = await sendMutation({
    clientRequestId: crypto.randomUUID(),
    discussionId,
    ...(mediaIds.length > 0 ? { mediaIds } : {}),
    text: normalizedPrompt
  });
  if (result.assistantAgent && context) {
    void respondAction({
      discussionId,
      promptMessageId: result.messageId,
      screen: serializeAgentScreenContext(context)
    }).catch((error: unknown) => toast.error(errorMessage(error, 'Unable to get Groam’s reply')));
  }
  return true;
}

async function uploadDiscussionMedia({
  files,
  previewMedia,
  store,
  uploadMedia
}: {
  files: File[];
  previewMedia: DiscussionMessageMedia[];
  store: ReturnType<typeof createDiscussionSendStore>;
  uploadMedia: ReturnType<typeof useMediaUpload>;
}): Promise<Id<'media'>[] | null> {
  const mediaIds: Id<'media'>[] = [];
  for (const file of files) {
    const mediaId = await uploadMedia(file, null);
    if (!mediaId) {
      clearDiscussionPreviews(previewMedia);
      store.getState().clearPending();
      return null;
    }
    mediaIds.push(mediaId);
  }
  return mediaIds;
}

export function clearDiscussionPreviews(media: DiscussionMessageMedia[]) {
  for (const item of media) {
    if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url);
  }
}
