import { describe, expect, test } from 'vitest';
import { parseAgentModels } from './agent-models';

describe('parseAgentModels', () => {
  test('accepts empty and valid per-agent selections', () => {
    expect(parseAgentModels(undefined)).toEqual({ selections: {}, valid: true });
    expect(
      parseAgentModels(
        JSON.stringify({ groam: { model: ' claude-haiku-4-5 ', provider: 'anthropic' } })
      )
    ).toEqual({
      selections: { groam: { model: 'claude-haiku-4-5', provider: 'anthropic' } },
      valid: true
    });
  });

  test.each([
    ['{invalid', 'AI_AGENT_MODELS must be valid JSON'],
    ['[]', 'AI_AGENT_MODELS must be a JSON object'],
    [
      JSON.stringify({ future: { model: 'x', provider: 'openai' } }),
      'AI_AGENT_MODELS contains unknown agent "future"'
    ],
    [
      JSON.stringify({ groam: { model: '', provider: 'openai' } }),
      'AI_AGENT_MODELS.groam must contain a valid provider and non-empty model'
    ]
  ])('returns a stable validation error for %s', (raw, error) => {
    expect(parseAgentModels(raw)).toEqual({ error, valid: false });
  });
});
