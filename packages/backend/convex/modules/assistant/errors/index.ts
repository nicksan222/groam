import { assistantFailureMessage } from '@groam/ai-contracts/errors';
import { ConvexError } from 'convex/values';

/** Throw a ConvexError with the provider message (sanitized), not a raw request dump. */
function toAssistantError(error: unknown): Error {
  return new ConvexError(assistantFailureMessage(error));
}

/** Traveler-facing assistant failures. Forwards the provider error message when available. */
// biome-ignore lint/complexity/noStaticOnlyClass: callers use this class, not loose functions
export class AssistantErrors {
  static from = toAssistantError;
  static message = assistantFailureMessage;
}
