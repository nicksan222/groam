import { describe, expect, test } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  test('prefers ConvexError data when present', () => {
    const error = Object.assign(new Error('[CONVEX A(x)] Server Error'), {
      data: 'Groam AI is busy right now. Wait a moment and try again.'
    });
    expect(errorMessage(error, 'fallback')).toBe(
      'Groam AI is busy right now. Wait a moment and try again.'
    );
  });

  test('unwraps Uncaught Error payloads from Convex action failures', () => {
    const message = errorMessage(
      new Error(
        '[CONVEX A(routes/discussions/messages/respond:run)] [Request ID: abc] Server Error\nUncaught Error: Groam AI is temporarily unavailable because the model provider is out of credits. Try again later or ask with a shorter message.'
      ),
      'Unable to get Groam’s reply'
    );
    expect(message).toMatch(/out of credits/i);
  });

  test('falls back when the payload is the AI SDK redaction', () => {
    expect(
      errorMessage(
        new Error(
          '[CONVEX A(routes/assistant/send:run)] Server Error\nUncaught Error: An error occurred.'
        ),
        'Unable to send your message'
      )
    ).toBe('Unable to send your message');
  });

  test('returns plain Error messages when they are already clear', () => {
    expect(errorMessage(new Error('Discussion not found'), 'fallback')).toBe(
      'Discussion not found'
    );
  });
});
