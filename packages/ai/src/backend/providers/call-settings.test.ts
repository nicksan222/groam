import { expect, test } from 'vitest';
import { chatAgentCallSettings } from './call-settings';

test('omits maxOutputTokens for OpenRouter so the request does not reserve a full completion budget', () => {
  expect(chatAgentCallSettings('https://openrouter.ai/api/v1')).toEqual({});
  expect(chatAgentCallSettings('https://openrouter.ai/api/v1/')).toEqual({});
});

test('reserves a completion cap for official OpenAI and other OpenAI-compatible hosts', () => {
  expect(chatAgentCallSettings(undefined)).toEqual({ maxOutputTokens: 1024 });
  expect(chatAgentCallSettings('https://api.openai.com/v1')).toEqual({ maxOutputTokens: 1024 });
});
