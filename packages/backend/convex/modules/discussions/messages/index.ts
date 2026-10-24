import { ConvexError } from 'convex/values';
import { MAX_DISCUSSION_MESSAGE_LENGTH } from '#convex/modules/discussions/threads/lengths';
import type { MessageContent } from '#convex/modules/discussions/threads/schema';

const MAX_CLIENT_REQUEST_ID_LENGTH = 100;

/**
 * Text and client request ids for discussion (and leftover comment) payloads.
 * `allowEmpty` is for media-only messages; the stored row then uses a preview label.
 */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class Messages {
  static normalizeContent(
    text: string,
    label: 'Comment' | 'Message',
    options?: { allowEmpty?: boolean }
  ): MessageContent {
    const normalized = text.trim();
    if (normalized.length > MAX_DISCUSSION_MESSAGE_LENGTH) {
      throw new ConvexError(
        `${label} text must be at most ${MAX_DISCUSSION_MESSAGE_LENGTH} characters`
      );
    }
    if (normalized.length === 0 && !options?.allowEmpty) {
      throw new ConvexError(
        `${label} text must be between 1 and ${MAX_DISCUSSION_MESSAGE_LENGTH} characters`
      );
    }
    return { format: 'plain_text', text: normalized };
  }

  static normalizeRequestId(value: string, label: 'Comment' | 'Discussion' | 'Message'): string {
    const normalized = value.trim();
    if (normalized.length < 8 || normalized.length > MAX_CLIENT_REQUEST_ID_LENGTH) {
      throw new ConvexError(
        `${label} request id must be between 8 and ${MAX_CLIENT_REQUEST_ID_LENGTH} characters`
      );
    }
    return normalized;
  }
}
