import { describe, expect, test } from 'vite-plus/test';
import {
  AssistantAppError,
  assistantFailureMessage,
  CHATGPT_RECONNECT,
  DEFAULT_ASSISTANT_FAILURE
} from './index';

describe('assistantFailureMessage', () => {
  test('keeps opaque SDK failures safe', () => {
    expect(assistantFailureMessage(new Error('An error occurred.'))).toBe(
      DEFAULT_ASSISTANT_FAILURE
    );
    expect(assistantFailureMessage(new Error('An error occurred'))).toBe(DEFAULT_ASSISTANT_FAILURE);
    expect(assistantFailureMessage(new Error('[CONVEX A(test)] Server Error'))).toBe(
      DEFAULT_ASSISTANT_FAILURE
    );
  });
  test('explains app plan limits instead of declaring the whole subscription empty', () => {
    const error = Object.assign(new Error('An error occurred.'), {
      statusCode: 429,
      responseBody: JSON.stringify({
        error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'Request failed' }
      })
    });
    expect(assistantFailureMessage(error)).toBe(
      'ChatGPT usage limit reached for this app. Review your limits in ChatGPT Settings → Usage before trying again.'
    );
  });
  test('preserves connections during temporary plan availability failures', () => {
    for (const code of [
      'subscription_sharing_usage_unavailable',
      'subscription_sharing_user_unavailable'
    ]) {
      expect(assistantFailureMessage({ error: { code }, statusCode: 503 })).toBe(
        'ChatGPT plan usage is temporarily unavailable. Try again later.'
      );
    }
  });
  test('maps terminal authorization failures to reconnect instructions', () => {
    for (const error of [
      { error: { code: 'invalid_grant' } },
      { statusCode: 401 },
      { name: 'ChatGptAuthorizationError', reconnect: true, message: 'An error occurred.' },
      { error: { code: 'refresh_token_reused' } }
    ]) {
      expect(assistantFailureMessage(error)).toBe(CHATGPT_RECONNECT);
    }
  });
  test('explains eligibility and unsupported capabilities without OAuth retry loops', () => {
    expect(
      assistantFailureMessage({ error: { code: 'subscription_sharing_user_not_eligible' } })
    ).toContain('account or workspace');
    expect(
      assistantFailureMessage({ error: { code: 'subscription_sharing_unsupported_capability' } })
    ).toContain('Change the model');
  });
  test('maps rate limits, context limits, and interrupted connections', () => {
    expect(assistantFailureMessage(new Error('Rate limit exceeded: too many requests'))).toContain(
      'Wait a moment'
    );
    expect(assistantFailureMessage({ error: { code: 'context_length_exceeded' } })).toContain(
      'Start a new chat'
    );
    expect(assistantFailureMessage(new Error('fetch failed'))).toContain('lost connection');
  });
  test('preserves already-friendly errors and reads nested SDK causes', () => {
    const message = 'Groam AI is busy right now. Wait a moment and try again.';
    expect(assistantFailureMessage({ data: message })).toBe(message);
    const error = new Error('An error occurred.');
    error.cause = new Error('The requested model is unavailable.');
    expect(assistantFailureMessage(error)).toBe(
      'The model provider said: The requested model is unavailable.'
    );
  });
  test('redacts credentials before forwarding diagnostics', () => {
    const result = assistantFailureMessage(
      new Error(
        'Diagnostic sk-abcdefghijklmnopqrstuvwxyz Bearer oauth-secret access_token=access-secret refresh_token=refresh-secret id_token=id-secret'
      )
    );
    for (const secret of [
      'sk-abcdefghijklmnopqrstuvwxyz',
      'oauth-secret',
      'access-secret',
      'refresh-secret',
      'id-secret'
    ])
      expect(result).not.toContain(secret);
    expect(result).toContain('[redacted]');
  });
});

describe('Groam-authored errors', () => {
  test('ConvexError string data passes through without provider prefix', () => {
    const error = Object.assign(new Error('Trip issue not found'), {
      name: 'ConvexError',
      data: 'Trip issue not found'
    });
    expect(assistantFailureMessage(error)).toBe('Trip issue not found');
  });
  test('AssistantAppError passes through', () => {
    expect(
      assistantFailureMessage(new AssistantAppError('Idea reviewer did not return a review'))
    ).toBe('Idea reviewer did not return a review');
  });
  test('Groam validation "too long" is not the conversation copy', () => {
    const error = Object.assign(new Error('Screen context title is too long'), {
      name: 'ConvexError',
      data: 'Screen context title is too long'
    });
    expect(assistantFailureMessage(error)).toBe('Screen context title is too long');
    expect(assistantFailureMessage(new Error('Title is too long'))).toBe(
      'The model provider said: Title is too long'
    );
  });
  test('provider errors keep prefix and context errors keep mapping', () => {
    expect(assistantFailureMessage(new Error('Weird upstream failure'))).toBe(
      'The model provider said: Weird upstream failure'
    );
    expect(assistantFailureMessage(new Error('maximum context length exceeded'))).toContain(
      'too long'
    );
  });
});
