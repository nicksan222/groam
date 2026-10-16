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
