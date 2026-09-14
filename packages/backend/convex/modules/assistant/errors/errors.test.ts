import { ConvexError } from 'convex/values';
import { expect, test } from 'vitest';
import { AssistantErrors } from '#convex/modules/assistant/errors/index';

test('wraps provider failures in a ConvexError', () => {
  const error = AssistantErrors.from(new Error('An error occurred.'));
  expect(error).toBeInstanceOf(ConvexError);
  expect(error).toMatchObject({ data: expect.stringMatching(/could not complete that reply/i) });
});

test('reads ConvexError data through the shared failure mapper', () => {
  expect(
    AssistantErrors.message(new ConvexError('Groam AI is not configured. Add OPENAI_API_KEY.'))
  ).toMatch(/Settings → AI/i);
});

test('maps nested AI_APICallError 402 through ConvexError wrapping', () => {
  const provider =
    'This request requires more credits, or fewer max_tokens. You requested up to 1024 tokens, but can only afford 245.';
  const apiError = Object.assign(new Error('An error occurred.'), {
    data: {
      error: {
        message: provider
      }
    },
    name: 'AI_APICallError',
    statusCode: 402
  });
  const wrapped = AssistantErrors.from(apiError);
  expect(wrapped).toMatchObject({ data: expect.stringContaining(provider) });
  expect(AssistantErrors.message(wrapped)).toContain(provider);
  expect(new ConvexError(AssistantErrors.message(wrapped))).toMatchObject({
    data: expect.stringContaining(provider)
  });
});
