import { describe, expect, test } from 'vitest';
import {
  assistantFailureMessage,
  DEFAULT_ASSISTANT_FAILURE,
  UNCONFIGURED_ASSISTANT
} from './index';

const OPENROUTER_402 =
  'This request requires more credits, or fewer max_tokens. You requested up to 1024 tokens, but can only afford 245.';

describe('assistantFailureMessage', () => {
  test('forwards OpenRouter credit / max_tokens failures', () => {
    expect(
      assistantFailureMessage(
        new Error(
          `AI_APICallError: This request requires more credits, or fewer max_tokens. You requested up to 4096 tokens, but can only afford 1839.`
        )
      )
    ).toBe(
      'The model provider said: This request requires more credits, or fewer max_tokens. You requested up to 4096 tokens, but can only afford 1839.'
    );
  });

  test('maps redacted AI SDK stream errors to a safe default', () => {
    expect(assistantFailureMessage(new Error('An error occurred.'))).toBe(
      DEFAULT_ASSISTANT_FAILURE
    );
  });

  test('forwards rate-limit provider copy', () => {
    expect(assistantFailureMessage(new Error('Rate limit exceeded: too many requests'))).toBe(
      'The model provider said: Rate limit exceeded: too many requests'
    );
  });

  test('points travelers at Settings when Groam AI is not configured', () => {
    expect(
      assistantFailureMessage({ data: 'Groam AI is not configured. Add OPENAI_API_KEY.' })
    ).toBe(UNCONFIGURED_ASSISTANT);
  });

  test('preserves already-friendly error data', () => {
    const message = 'Groam AI is busy right now. Wait a moment and try again.';
    expect(assistantFailureMessage({ data: message })).toBe(message);
  });

  test('reads nested causes when the outer message is redacted', () => {
    const error = new Error('An error occurred.');
    error.cause = new Error('This request requires more credits, or fewer max_tokens.');
    expect(assistantFailureMessage(error)).toBe(
      'The model provider said: This request requires more credits, or fewer max_tokens.'
    );
  });

  test('reads OpenRouter payloads nested on AI SDK API call errors', () => {
    const error = new Error('An error occurred.');
    Object.assign(error, {
      data: {
        error: {
          message: OPENROUTER_402
        }
      },
      responseBody: `{"error":{"message":"${OPENROUTER_402}"}}`,
      statusCode: 402
    });
    expect(assistantFailureMessage(error)).toBe(`The model provider said: ${OPENROUTER_402}`);
  });

  test('maps HTTP 402 when the stream message is redacted', () => {
    const error = Object.assign(new Error('An error occurred.'), {
      name: 'AI_APICallError',
      statusCode: 402
    });
    expect(assistantFailureMessage(error)).toMatch(/out of credits/i);
  });

  test('redacts API keys instead of forwarding them', () => {
    expect(assistantFailureMessage(new Error('Invalid key sk-abcdefghijklmnopqrstuvwxyz'))).toBe(
      'The model provider said: Invalid key [redacted]'
    );
  });
});
