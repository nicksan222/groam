import { isRateLimitError } from '@convex-dev/rate-limiter';
import { assistantFailureMessage } from '@groam/ai/backend/errors';
import { ConvexError } from 'convex/values';

/** Readable copy for a tripped rate limit; null when `error` is not a rate-limit error. */
function rateLimitMessage(error: unknown): string | null {
  if (!isRateLimitError(error)) return null;
  const { name, retryAfter } = error.data;
  const minutes = Math.max(1, Math.ceil((Number(retryAfter) || 0) / 60_000));
  const wait = `Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
  return name === 'assistantThreadCreate'
    ? `Too many new chats. ${wait}`
    : `Too many messages. ${wait}`;
}

function assistantMessage(error: unknown): string {
  return rateLimitMessage(error) ?? assistantFailureMessage(error);
}

/** Throw a ConvexError with a traveler-facing message, not a raw request dump. */
function toAssistantError(error: unknown): Error {
  return new ConvexError(assistantMessage(error));
}

/** Traveler-facing assistant failures. Forwards the provider error message when available. */
// oxlint-disable-next-line unicorn/no-static-only-class -- callers use this class, not loose functions
export class AssistantErrors {
  static from = toAssistantError;
  static message = assistantMessage;
}
