import { ConvexError } from 'convex/values';
import { expect, test } from 'vite-plus/test';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';

test('wraps provider failures in a ConvexError', () => {
  const error = AssistantErrors.from(new Error('An error occurred.'));
  expect(error).toBeInstanceOf(ConvexError);
  expect(error).toMatchObject({ data: expect.stringMatching(/could not complete that reply/i) });
});

test('reads ConvexError data through the shared failure mapper', () => {
  expect(
    AssistantErrors.message(
      new ConvexError('Connect ChatGPT in Settings → AI to use your ChatGPT plan.')
    )
  ).toMatch(/Settings → AI/i);
});

test('preserves actionable ChatGPT usage errors through ConvexError wrapping', () => {
  const apiError = Object.assign(new Error('An error occurred.'), {
    data: { error: { code: 'subscription_sharing_usage_limit_exceeded' } },
    name: 'AI_APICallError',
    statusCode: 429
  });
  const wrapped = AssistantErrors.from(apiError);
  expect(wrapped).toMatchObject({ data: expect.stringContaining('ChatGPT usage limit reached') });
  expect(AssistantErrors.message(wrapped)).toContain('ChatGPT Settings → Usage');
  expect(new ConvexError(AssistantErrors.message(wrapped))).toMatchObject({
    data: expect.stringContaining('ChatGPT usage limit reached')
  });
});

test('turns rate-limit errors into readable copy', () => {
  const limited = (name: string, retryAfter: number) =>
    new ConvexError({ kind: 'RateLimited', name, retryAfter });
  expect(AssistantErrors.message(limited('tripAssistantMessage', 61_234.5))).toBe(
    'Too many messages. Try again in 2 minutes.'
  );
  expect(AssistantErrors.message(limited('assistantThreadCreate', 10))).toBe(
    'Too many new chats. Try again in 1 minute.'
  );
  expect(AssistantErrors.message(limited('tripAssistantMessage', 5000))).not.toMatch(/provider/i);
});
